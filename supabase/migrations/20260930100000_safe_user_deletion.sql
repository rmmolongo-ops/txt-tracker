-- Suppression d'un utilisateur : éviter les échecs silencieux et la perte d'équipes.
--
-- 1. managed_players.created_by, seances.validated_by et team_daily_sessions.created_by
--    bloquaient la suppression de tout coach ayant créé un joueur géré, validé une séance ou
--    créé une séance du jour (erreur de clé étrangère, transaction annulée). On garde les
--    données et on efface seulement la référence à l'auteur (colonnes déjà nullables).
alter table public.managed_players
  drop constraint managed_players_created_by_fkey,
  add constraint managed_players_created_by_fkey
    foreign key (created_by) references auth.users(id) on delete set null;

alter table public.seances
  drop constraint seances_validated_by_fkey,
  add constraint seances_validated_by_fkey
    foreign key (validated_by) references auth.users(id) on delete set null;

alter table public.team_daily_sessions
  drop constraint team_daily_sessions_created_by_fkey,
  add constraint team_daily_sessions_created_by_fkey
    foreign key (created_by) references auth.users(id) on delete set null;

-- 2. teams.admin_id était en ON DELETE CASCADE : supprimer l'utilisateur qui administre une
--    équipe effaçait l'équipe, ses membres, joueurs gérés, séances, programmes et messages.
--    On passe en NO ACTION : la base refuse désormais la suppression tant que l'utilisateur
--    administre une équipe, quel que soit le chemin (RPC, dashboard Supabase, SQL).
alter table public.teams
  drop constraint teams_admin_id_fkey,
  add constraint teams_admin_id_fkey
    foreign key (admin_id) references auth.users(id) on delete no action;

-- 3. delete_user_as_admin : message clair plutôt qu'une erreur de clé étrangère brute.
create or replace function public.delete_user_as_admin(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  nb_equipes integer;
begin
  if not exists (select 1 from public.admins where user_id = auth.uid()) then
    raise exception 'Accès refusé : réservé aux administrateurs';
  end if;

  select count(*) into nb_equipes from public.teams where admin_id = target_user_id;
  if nb_equipes > 0 then
    raise exception 'Cet utilisateur administre % équipe(s) : réassignez-les à un autre administrateur avant de le supprimer', nb_equipes;
  end if;

  delete from public.mesures where user_id = target_user_id;
  delete from public.seances where user_id = target_user_id;
  delete from public.profils where user_id = target_user_id;
  delete from public.admins  where user_id = target_user_id;
  delete from auth.users     where id = target_user_id;
end;
$function$;
