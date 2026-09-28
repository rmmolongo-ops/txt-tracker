-- Corrige "infinite recursion detected in policy for relation club_members".
--
-- club_admins_manage_club_members interrogeait directement club_members dans
-- son propre USING : toute requête sur club_members (y compris indirecte,
-- ex. la policy club_managers_manage_teams lors d'un insert sur teams)
-- déclenche l'évaluation RLS de club_members, qui réévalue cette policy,
-- qui réinterroge club_members... récursion infinie.
--
-- Fix : la vérification passe par une fonction SECURITY DEFINER (comme
-- is_club_manager pour les autres tables), qui s'exécute avec les droits du
-- propriétaire de la table et contourne donc la RLS au lieu de la redéclencher.

CREATE OR REPLACE FUNCTION public.is_club_admin(check_club_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from club_members cm
    where cm.club_id = check_club_id
      and cm.user_id = auth.uid()
      and cm.role = 'admin'
  );
$function$;

revoke execute on function public.is_club_admin(uuid) from public, anon;
grant execute on function public.is_club_admin(uuid) to authenticated;

drop policy if exists club_admins_manage_club_members on public.club_members;

create policy club_admins_manage_club_members on public.club_members as PERMISSIVE for ALL to public
  using (
    exists (select 1 from public.admins where user_id = (select auth.uid()))
    or public.is_club_admin(club_members.club_id)
  );
