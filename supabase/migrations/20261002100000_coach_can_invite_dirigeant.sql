-- Un coach de club peut inviter des coachs et des dirigeants dans SON club ; seuls un admin de club
-- ou le super admin peuvent inviter un administrateur. Remplace 20261002000000.

CREATE OR REPLACE FUNCTION public.create_club_invite(p_club_id uuid, p_role text, p_expires_in_days int default 7)
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
    OR (caller_role = 'dirigeant' AND p_role IN ('dirigeant', 'coach'))
    OR (caller_role = 'coach' AND p_role IN ('dirigeant', 'coach'))
  ) THEN
    RAISE EXCEPTION 'Accès refusé : ton rôle ne permet pas d''inviter ce type de membre';
  END IF;

  new_code := encode(extensions.gen_random_bytes(9), 'base64');
  new_code := replace(replace(replace(new_code, '/', '_'), '+', '-'), '=', '');

  INSERT INTO public.club_invites (club_id, code, role, created_by, expires_at)
  VALUES (p_club_id, new_code, p_role, auth.uid(), now() + (p_expires_in_days || ' days')::interval);

  RETURN new_code;
END;
$function$;
