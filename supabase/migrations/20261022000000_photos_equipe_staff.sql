-- Photo d'équipe : envoyable par le staff, pas seulement par le super admin.
--
-- Avant : seul le super admin pouvait envoyer le fichier (stockage, dossier teams/) et modifier
-- teams.photo_url ; un admin/dirigeant de club échouait, un coach n'avait aucun moyen de le faire.
-- Après : le super admin, les admins/dirigeants du club et les coachs/dirigeants DE CETTE ÉQUIPE.
-- Le staff d'équipe n'obtient pas le droit de modifier la fiche équipe (nom, club…) : la photo
-- est enregistrée par une fonction qui ne touche que photo_url.

create or replace function public.can_manage_team(p_team_id uuid)
 returns boolean
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  select auth.uid() is not null and (
    exists (select 1 from public.admins where user_id = auth.uid())
    or public.is_club_manager(p_team_id)
    or exists (
      select 1 from public.team_members
      where team_id = p_team_id and user_id = auth.uid() and role in ('coach', 'dirigeant')
    )
  );
$function$;

revoke execute on function public.can_manage_team(uuid) from public, anon;
grant execute on function public.can_manage_team(uuid) to authenticated;

-- Chemin attendu : teams/<id d'équipe>/photo.jpg. Un chemin mal formé est refusé, sans erreur.
create or replace function public.can_manage_team_photo(object_name text)
 returns boolean
 language plpgsql
 stable
 security definer
 set search_path to 'public'
as $function$
declare
  photo_team uuid;
begin
  if split_part(object_name, '/', 1) <> 'teams' then
    return false;
  end if;
  begin
    photo_team := split_part(object_name, '/', 2)::uuid;
  exception when others then
    return false;
  end;
  return public.can_manage_team(photo_team);
end;
$function$;

revoke execute on function public.can_manage_team_photo(text) from public, anon;
grant execute on function public.can_manage_team_photo(text) to authenticated;

drop policy if exists admins_insert_team_photos on storage.objects;
drop policy if exists admins_update_team_photos on storage.objects;

create policy staff_insert_team_photos on storage.objects as PERMISSIVE for INSERT to authenticated
  with check (bucket_id = 'photos' and public.can_manage_team_photo(name));

create policy staff_update_team_photos on storage.objects as PERMISSIVE for UPDATE to authenticated
  using (bucket_id = 'photos' and public.can_manage_team_photo(name))
  with check (bucket_id = 'photos' and public.can_manage_team_photo(name));

create policy staff_delete_team_photos on storage.objects as PERMISSIVE for DELETE to authenticated
  using (bucket_id = 'photos' and public.can_manage_team_photo(name));

-- Enregistre l'adresse de la photo : seulement photo_url, seulement une photo du dossier de
-- cette équipe (pas d'adresse externe ni de photo d'une autre équipe).
create or replace function public.set_team_photo(p_team_id uuid, p_photo_url text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if not public.can_manage_team(p_team_id) then
    raise exception 'Accès refusé : réservé au staff de l''équipe';
  end if;
  if p_photo_url is not null and position('/storage/v1/object/public/photos/teams/' || p_team_id::text || '/' in p_photo_url) = 0 then
    raise exception 'Adresse de photo invalide';
  end if;
  update public.teams set photo_url = p_photo_url where id = p_team_id;
end;
$function$;

revoke execute on function public.set_team_photo(uuid, text) from public, anon;
grant execute on function public.set_team_photo(uuid, text) to authenticated;
