-- Sécurise les invitations club :
-- 1. Les dirigeants ne peuvent plus écrire directement dans club_invites (ils pouvaient s'y
--    fabriquer une invitation 'admin') : lecture seule pour eux, toute création passe par
--    create_club_invite qui applique les règles de rôle. L'écriture directe reste réservée
--    au super admin et aux admins du club.
-- 2. Un lien d'invitation expire au bout de 24 h (le paramètre de durée disparaît).

drop policy if exists club_managers_manage_club_invites on public.club_invites;

create policy club_managers_read_club_invites on public.club_invites as PERMISSIVE for SELECT to authenticated
  using (
    exists (select 1 from public.admins where user_id = (select auth.uid()))
    or exists (
      select 1 from public.club_members cm
      where cm.club_id = club_invites.club_id
        and cm.user_id = (select auth.uid())
        and cm.role in ('admin', 'dirigeant')
    )
  );

create policy club_admins_write_club_invites on public.club_invites as PERMISSIVE for ALL to authenticated
  using (
    exists (select 1 from public.admins where user_id = (select auth.uid()))
    or exists (
      select 1 from public.club_members cm
      where cm.club_id = club_invites.club_id
        and cm.user_id = (select auth.uid())
        and cm.role = 'admin'
    )
  )
  with check (
    exists (select 1 from public.admins where user_id = (select auth.uid()))
    or exists (
      select 1 from public.club_members cm
      where cm.club_id = club_invites.club_id
        and cm.user_id = (select auth.uid())
        and cm.role = 'admin'
    )
  );

drop function if exists public.create_club_invite(uuid, text, int);

CREATE OR REPLACE FUNCTION public.create_club_invite(p_club_id uuid, p_role text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  caller_role text;
  new_code text;
BEGIN
  IF p_role NOT IN ('admin', 'dirigeant', 'coach') THEN
    RAISE EXCEPTION 'Rôle invalide : %', p_role;
  END IF;

  SELECT role INTO caller_role FROM public.club_members
  WHERE club_id = p_club_id AND user_id = auth.uid();

  IF caller_role IS NULL AND NOT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Accès refusé : réservé aux membres du club';
  END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
    OR caller_role = 'admin'
    OR (caller_role IN ('dirigeant', 'coach') AND p_role IN ('dirigeant', 'coach'))
  ) THEN
    RAISE EXCEPTION 'Accès refusé : ton rôle ne permet pas d''inviter ce type de membre';
  END IF;

  new_code := encode(extensions.gen_random_bytes(9), 'base64');
  new_code := replace(replace(replace(new_code, '/', '_'), '+', '-'), '=', '');

  INSERT INTO public.club_invites (club_id, code, role, created_by, expires_at)
  VALUES (p_club_id, new_code, p_role, auth.uid(), now() + interval '24 hours');

  RETURN new_code;
END;
$function$;

revoke execute on function public.create_club_invite(uuid, text) from public, anon;
grant execute on function public.create_club_invite(uuid, text) to authenticated;
