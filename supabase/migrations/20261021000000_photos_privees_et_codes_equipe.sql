-- Étape 1 (additive, sans effet sur le site actuel) : codes d'équipe révocables et lecture des
-- photos par règles d'accès. L'étape 2 (20261021100000) rend le stockage privé et retire l'ancien
-- lien joueur, une fois le nouveau code déployé.

-- ---------------------------------------------------------------------
-- 1. Lien joueur révocable : un code par équipe, renouvelable
-- ---------------------------------------------------------------------
-- Avant, le lien joueur contenait l'identifiant de l'équipe : permanent, impossible à retirer
-- (un joueur parti pouvait revenir). Le lien contient désormais un code aléatoire que le coach
-- peut renouveler ; l'ancien lien cesse alors immédiatement de fonctionner.

create table public.team_join_codes (
  team_id uuid primary key references public.teams(id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

alter table public.team_join_codes enable row level security;

-- Lecture réservée à ceux qui gèrent l'équipe (ils partagent le lien) ; aucune écriture directe.
create policy team_leaders_read_join_code on public.team_join_codes as PERMISSIVE for SELECT to authenticated
  using (
    exists (
      select 1 from public.team_members tm
      where tm.team_id = team_join_codes.team_id and tm.user_id = (select auth.uid()) and tm.role in ('coach', 'dirigeant')
    )
    or public.is_club_manager(team_id)
    or exists (select 1 from public.admins where user_id = (select auth.uid()))
  );

create or replace function public.new_join_code()
 returns text
 language sql
 volatile
 set search_path to 'public'
as $function$
  select replace(replace(replace(encode(extensions.gen_random_bytes(9), 'base64'), '/', '_'), '+', '-'), '=', '');
$function$;

revoke execute on function public.new_join_code() from public, anon, authenticated;

insert into public.team_join_codes (team_id, code)
select id, public.new_join_code() from public.teams
on conflict (team_id) do nothing;

create or replace function public.create_team_join_code_on_team_insert()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  insert into public.team_join_codes (team_id, code, created_by) values (new.id, public.new_join_code(), auth.uid())
  on conflict (team_id) do nothing;
  return new;
end;
$function$;

revoke execute on function public.create_team_join_code_on_team_insert() from public, anon, authenticated;

create trigger teams_create_join_code after insert on public.teams
  for each row execute function public.create_team_join_code_on_team_insert();

-- Renouveler le code : l'ancien lien ne fonctionne plus.
create or replace function public.regenerate_team_join_code(p_team_id uuid)
 returns text
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  new_code text;
begin
  if auth.uid() is null then
    raise exception 'Connexion requise';
  end if;
  if not (
    exists (select 1 from public.team_members where team_id = p_team_id and user_id = auth.uid() and role in ('coach', 'dirigeant'))
    or public.is_club_manager(p_team_id)
    or exists (select 1 from public.admins where user_id = auth.uid())
  ) then
    raise exception 'Accès refusé : réservé au staff de l''équipe';
  end if;
  new_code := public.new_join_code();
  insert into public.team_join_codes (team_id, code, created_by) values (p_team_id, new_code, auth.uid())
  on conflict (team_id) do update set code = excluded.code, created_at = now(), created_by = excluded.created_by;
  return new_code;
end;
$function$;

revoke execute on function public.regenerate_team_join_code(uuid) from public, anon;
grant execute on function public.regenerate_team_join_code(uuid) to authenticated;

-- Rejoindre une équipe avec le code du lien (rôle joueur).
create or replace function public.join_team_with_code(p_code text)
 returns text
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  target uuid;
  team_name text;
begin
  if auth.uid() is null then
    raise exception 'Connexion requise';
  end if;
  select jc.team_id, t.name into target, team_name
  from public.team_join_codes jc join public.teams t on t.id = jc.team_id
  where jc.code = p_code;
  if target is null then
    raise exception 'Ce lien d''invitation n''est plus valide : demande le nouveau lien à ton coach';
  end if;
  insert into public.team_members (team_id, user_id, role) values (target, auth.uid(), 'joueur')
  on conflict do nothing;
  return team_name;
end;
$function$;

revoke execute on function public.join_team_with_code(text) from public, anon;
grant execute on function public.join_team_with_code(text) to authenticated;

-- Page d'inscription (non connecté) : nom de l'équipe et du club pour un code valide, rien sinon.
create or replace function public.get_team_join_info(p_code text)
 returns table (team_name text, club_name text)
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  select t.name, c.name
  from public.team_join_codes jc
  join public.teams t on t.id = jc.team_id
  left join public.clubs c on c.id = t.club_id
  where jc.code = p_code;
$function$;

revoke execute on function public.get_team_join_info(text) from public;
grant execute on function public.get_team_join_info(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Photos : qui peut obtenir un lien signé
-- ---------------------------------------------------------------------
-- Dossier <user_id>/ : la personne, ses coéquipiers, les responsables d'un club où elle joue,
-- le super admin. Dossier teams/<team_id>/ : les membres de l'équipe, de son club, le super admin.

create or replace function public.can_view_photo(object_name text)
 returns boolean
 language plpgsql
 stable
 security definer
 set search_path to 'public'
as $function$
declare
  first_segment text := split_part(object_name, '/', 1);
  owner_id uuid;
  photo_team uuid;
begin
  if auth.uid() is null then
    return false;
  end if;
  if exists (select 1 from public.admins where user_id = auth.uid()) then
    return true;
  end if;

  if first_segment = 'teams' then
    begin
      photo_team := split_part(object_name, '/', 2)::uuid;
    exception when others then
      return false;
    end;
    return public.is_team_member(photo_team)
      or public.is_club_manager(photo_team)
      or exists (select 1 from public.teams t where t.id = photo_team and t.club_id is not null and public.is_club_member(t.club_id));
  end if;

  begin
    owner_id := first_segment::uuid;
  exception when others then
    return false;
  end;
  if owner_id = auth.uid() then
    return true;
  end if;
  return exists (
      select 1 from public.team_members me join public.team_members other on other.team_id = me.team_id
      where me.user_id = auth.uid() and other.user_id = owner_id
    )
    or exists (
      select 1 from public.team_members other
      where other.user_id = owner_id and public.is_club_manager(other.team_id)
    );
end;
$function$;

revoke execute on function public.can_view_photo(text) from public, anon;
grant execute on function public.can_view_photo(text) to authenticated;

drop policy if exists "Voir ses photos" on storage.objects;

create policy "Voir les photos autorisees" on storage.objects as PERMISSIVE for SELECT to authenticated
  using (bucket_id = 'photos' and public.can_view_photo(name));

-- Envoi et suppression de sa photo : limités au bucket des photos (la règle d'origine ne
-- vérifiait que le dossier, pas le bucket).
drop policy if exists "Upload photo personnelle" on storage.objects;
create policy "Upload photo personnelle" on storage.objects as PERMISSIVE for INSERT to authenticated
  with check (bucket_id = 'photos' and (select auth.uid())::text = (storage.foldername(name))[1]);

drop policy if exists "Supprimer photo personnelle" on storage.objects;
create policy "Supprimer photo personnelle" on storage.objects as PERMISSIVE for DELETE to authenticated
  using (bucket_id = 'photos' and (select auth.uid())::text = (storage.foldername(name))[1]);
