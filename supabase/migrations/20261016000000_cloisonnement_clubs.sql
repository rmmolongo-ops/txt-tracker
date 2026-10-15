-- Cloisonnement par club.
--
-- Avant : toutes les équipes et tous les clubs étaient lisibles par n'importe qui (même sans
-- compte), et tout utilisateur connecté pouvait s'ajouter lui-même à n'importe quelle équipe.
-- Après :
--  1. Un utilisateur ne voit que ses équipes et celles du club dont il est membre ; il ne voit
--     que son (ses) club(s). Le super admin (table admins) garde l'accès complet.
--  2. On ne rejoint plus une équipe directement : seulement via un lien d'invitation (RPC).
--  3. Les liens staff (coach/dirigeant) ciblent une équipe précise ; seul un lien administrateur
--     est au niveau du club.
--  4. La page d'inscription (non connecté) ne lit plus les tables : elle interroge deux
--     fonctions qui ne répondent que pour un lien valide.
--  5. Limite gratuite : 12 joueurs sans compte par équipe (le super admin en est exempté).

-- ---------------------------------------------------------------------
-- 1. Visibilité des équipes et des clubs
-- ---------------------------------------------------------------------

create or replace function public.is_club_member(check_club_id uuid)
 returns boolean
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  select exists (
    select 1 from club_members
    where club_id = check_club_id and user_id = auth.uid()
  );
$function$;

revoke execute on function public.is_club_member(uuid) from public, anon;
grant execute on function public.is_club_member(uuid) to authenticated;

drop policy if exists public_read_teams on public.teams;
drop policy if exists authenticated_read_teams on public.teams;

create policy members_read_own_teams on public.teams as PERMISSIVE for SELECT to authenticated
  using (
    public.is_team_member(id)
    or (club_id is not null and public.is_club_member(club_id))
  );

drop policy if exists public_read_clubs on public.clubs;

-- Un club est visible si on en est membre ou si on voit au moins une de ses équipes
-- (la sous-requête sur teams applique la règle ci-dessus à l'appelant).
create policy members_read_own_clubs on public.clubs as PERMISSIVE for SELECT to authenticated
  using (
    public.is_club_member(id)
    or exists (select 1 from public.teams t where t.club_id = clubs.id)
  );

-- Ces règles s'appliquaient aussi aux visiteurs non connectés (rôle anon) : sans règle de lecture
-- publique, leur évaluation provoquait une erreur de permission au lieu d'un résultat vide.
-- Un visiteur n'a plus aucune règle sur teams et clubs.
alter policy admins_manage_teams on public.teams to authenticated;
alter policy club_managers_manage_teams on public.teams to authenticated;
alter policy admins_manage_clubs on public.clubs to authenticated;

-- ---------------------------------------------------------------------
-- 2. Rejoindre une équipe : uniquement par lien d'invitation
-- ---------------------------------------------------------------------

drop policy if exists users_join_own_team on public.team_members;

-- Le lien d'équipe contient l'identifiant de l'équipe, qui n'est plus énumérable : sa
-- connaissance fait office de secret. Rôle imposé : joueur.
create or replace function public.join_team_via_link(p_team_id uuid)
 returns text
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  team_name text;
begin
  if auth.uid() is null then
    raise exception 'Connexion requise';
  end if;
  select name into team_name from public.teams where id = p_team_id;
  if team_name is null then
    raise exception 'Lien d''invitation invalide';
  end if;
  insert into public.team_members (team_id, user_id, role)
  values (p_team_id, auth.uid(), 'joueur')
  on conflict do nothing;
  return team_name;
end;
$function$;

revoke execute on function public.join_team_via_link(uuid) from public, anon;
grant execute on function public.join_team_via_link(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 3. Liens staff ciblant une équipe
-- ---------------------------------------------------------------------

alter table public.club_invites add column if not exists team_id uuid references public.teams(id) on delete cascade;
create index if not exists club_invites_team_id_idx on public.club_invites (team_id);

-- Écriture directe supprimée : un admin de club pouvait y fabriquer une invitation visant l'équipe
-- d'un AUTRE club. Toute création passe désormais par create_club_invite, qui vérifie que
-- l'équipe appartient bien au club. La lecture (compteurs d'invitations en attente) reste.
drop policy if exists club_admins_write_club_invites on public.club_invites;

-- Anciens liens staff non utilisés (sans équipe) : ils donnaient des droits à l'échelle du club.
delete from public.club_invites where used_at is null and team_id is null and role <> 'admin';

drop function if exists public.create_club_invite(uuid, text);
drop function if exists public.create_club_invite(uuid, text, int);

-- coach / dirigeant : lien lié à UNE équipe du club, créé par le super admin, un admin du club,
-- ou un coach/dirigeant de cette équipe. administrateur : lien au niveau du club, créé
-- uniquement par le super admin ou un admin du club.
create or replace function public.create_club_invite(p_club_id uuid, p_role text, p_team_id uuid default null)
 returns text
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  is_super boolean;
  caller_role text;
  is_team_leader boolean := false;
  new_code text;
begin
  if auth.uid() is null then
    raise exception 'Connexion requise';
  end if;
  if p_role not in ('admin', 'dirigeant', 'coach') then
    raise exception 'Rôle invalide : %', p_role;
  end if;

  is_super := exists (select 1 from public.admins where user_id = auth.uid());
  select role into caller_role from public.club_members where club_id = p_club_id and user_id = auth.uid();
  -- Non membre du club : caller_role serait NULL, et « not (false or NULL or false) » vaut NULL,
  -- donc le refus ne se déclencherait jamais. On force une valeur non nulle.
  caller_role := coalesce(caller_role, '');

  if p_role = 'admin' then
    if p_team_id is not null then
      raise exception 'Un lien administrateur concerne le club, pas une équipe';
    end if;
    if not (is_super or caller_role = 'admin') then
      raise exception 'Accès refusé : seul un administrateur peut inviter un administrateur';
    end if;
  else
    if p_team_id is null then
      raise exception 'Choisis l''équipe que ce lien doit rejoindre';
    end if;
    if not exists (select 1 from public.teams where id = p_team_id and club_id = p_club_id) then
      raise exception 'Cette équipe n''appartient pas à ce club';
    end if;
    select exists (
      select 1 from public.team_members
      where team_id = p_team_id and user_id = auth.uid() and role in ('coach', 'dirigeant')
    ) into is_team_leader;
    if not (is_super or caller_role in ('admin', 'dirigeant') or is_team_leader) then
      raise exception 'Accès refusé : ton rôle ne permet pas d''inviter dans cette équipe';
    end if;
  end if;

  new_code := encode(extensions.gen_random_bytes(9), 'base64');
  new_code := replace(replace(replace(new_code, '/', '_'), '+', '-'), '=', '');

  insert into public.club_invites (club_id, code, role, created_by, expires_at, team_id)
  values (p_club_id, new_code, p_role, auth.uid(), now() + interval '24 hours', p_team_id);

  return new_code;
end;
$function$;

revoke execute on function public.create_club_invite(uuid, text, uuid) from public, anon;
grant execute on function public.create_club_invite(uuid, text, uuid) to authenticated;

-- Utilisation d'un lien : un lien d'équipe ajoute au club (sans pouvoir de gestion à l'échelle du
-- club) ET à l'équipe avec le rôle du lien ; un lien administrateur ajoute au club en admin.
-- Un rôle déjà supérieur n'est jamais rétrogradé.
create or replace function public.redeem_club_invite(p_code text)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  inv record;
  club_role text;
begin
  if auth.uid() is null then
    raise exception 'Connexion requise';
  end if;

  select * into inv from public.club_invites where code = p_code for update;

  if inv is null then
    raise exception 'Code d''invitation invalide';
  end if;
  if inv.used_at is not null then
    raise exception 'Ce code d''invitation a déjà été utilisé';
  end if;
  if inv.expires_at < now() then
    raise exception 'Ce code d''invitation a expiré';
  end if;

  if inv.team_id is not null and not exists (select 1 from public.teams where id = inv.team_id and club_id = inv.club_id) then
    raise exception 'Invitation incohérente';
  end if;

  club_role := case when inv.team_id is null then inv.role else 'coach' end;

  insert into public.club_members (club_id, user_id, role)
  values (inv.club_id, auth.uid(), club_role)
  on conflict (club_id, user_id) do update set role =
    case
      when club_members.role = 'admin' then 'admin'
      when club_members.role = 'dirigeant' and excluded.role <> 'admin' then 'dirigeant'
      else excluded.role
    end;

  if inv.team_id is not null then
    insert into public.team_members (team_id, user_id, role)
    values (inv.team_id, auth.uid(), inv.role)
    on conflict (team_id, user_id) do update set role = case when team_members.role = 'dirigeant' then 'dirigeant' else excluded.role end;
  end if;

  update public.club_invites set used_at = now(), used_by = auth.uid() where id = inv.id;

  return inv.club_id;
end;
$function$;

-- ---------------------------------------------------------------------
-- 4. Informations d'un lien pour la page d'inscription (non connecté)
-- ---------------------------------------------------------------------

drop function if exists public.get_club_invite_info(text);

create or replace function public.get_club_invite_info(p_code text)
 returns table (club_id uuid, club_name text, role text, team_id uuid, team_name text)
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  select ci.club_id, c.name, ci.role, ci.team_id, t.name
  from public.club_invites ci
  join public.clubs c on c.id = ci.club_id
  left join public.teams t on t.id = ci.team_id
  where ci.code = p_code and ci.used_at is null and ci.expires_at > now();
$function$;

revoke execute on function public.get_club_invite_info(text) from public;
grant execute on function public.get_club_invite_info(text) to anon, authenticated;

create or replace function public.get_team_invite_info(p_team_id uuid)
 returns table (team_name text, club_name text)
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  select t.name, c.name
  from public.teams t
  left join public.clubs c on c.id = t.club_id
  where t.id = p_team_id;
$function$;

revoke execute on function public.get_team_invite_info(uuid) from public;
grant execute on function public.get_team_invite_info(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. Limite gratuite : 12 joueurs sans compte par équipe (super admin exempté)
-- ---------------------------------------------------------------------

create or replace function public.enforce_managed_players_limit()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if auth.uid() is null or exists (select 1 from public.admins where user_id = auth.uid()) then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.team_id is not distinct from old.team_id then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtext(new.team_id::text));
  if (select count(*) from public.managed_players where team_id = new.team_id) >= 12 then
    raise exception 'Limite de 12 joueurs sans compte atteinte pour cette équipe (formule gratuite)';
  end if;
  return new;
end;
$function$;

revoke execute on function public.enforce_managed_players_limit() from public, anon, authenticated;

drop trigger if exists managed_players_limit on public.managed_players;
create trigger managed_players_limit before insert or update of team_id on public.managed_players
  for each row execute function public.enforce_managed_players_limit();
