-- Page d'inscription via un lien staff : le club visé doit être affiché et verrouillé avant la
-- création du compte, donc lisible sans être connecté. Le code (72 bits aléatoires, usage
-- unique, 24 h) sert de secret : la fonction ne renvoie rien si le code est inconnu, utilisé
-- ou expiré, et seulement le nom du club et le rôle proposé.
create or replace function public.get_club_invite_info(p_code text)
 returns table (club_id uuid, club_name text, role text)
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  select ci.club_id, c.name, ci.role
  from public.club_invites ci
  join public.clubs c on c.id = ci.club_id
  where ci.code = p_code and ci.used_at is null and ci.expires_at > now();
$function$;

revoke execute on function public.get_club_invite_info(text) from public;
grant execute on function public.get_club_invite_info(text) to anon, authenticated;
