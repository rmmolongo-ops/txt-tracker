-- =====================================================================
-- Multi-tenant club : isolation par club, rôles club-level, invitations.
--
-- Contexte : jusqu'ici `admins` est global (accès à tout, tous clubs
-- confondus) — c'est l'accès plateforme du gérant, qu'on garde tel quel.
-- On ajoute un niveau intermédiaire : un club peut avoir plusieurs
-- administrateurs/dirigeants (`club_members`), scopés à leur seul club.
--
-- Deux mécanismes d'invitation distincts, par sensibilité :
--  - Joueur → équipe : lien simple existant (`?invite=<teamId>`), inchangé.
--  - Coach/dirigeant → club : code à usage unique et expirant
--    (`club_invites` + fonctions dédiées), car l'accès accordé couvre
--    toutes les équipes du club, potentiellement des données de mineurs.
--
-- Toutes les nouvelles policies sont ADDITIVES (PERMISSIVE) : les policies
-- existantes ne sont ni modifiées ni supprimées, elles continuent de
-- s'appliquer telles quelles. L'accès club-level vient s'ajouter en OR.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. teams.club_id — rattachement des équipes à un club
-- ---------------------------------------------------------------------

alter table public.teams add column club_id uuid;
alter table public.teams add constraint teams_club_id_fkey
  foreign key (club_id) references public.clubs(id) on delete set null;
create index teams_club_id_idx on public.teams (club_id);

-- Backfill : club le plus représenté parmi les profils des membres de
-- chaque équipe (comparaison insensible à la casse/espaces), sans jamais
-- créer de club — si aucune correspondance n'est trouvée, club_id reste
-- null et devra être assigné manuellement (rare : profils.club vide/libre).
with team_club_votes as (
  select tm.team_id, c.id as club_id, count(*) as votes
  from public.team_members tm
  join public.profils p on p.user_id = tm.user_id
  join public.clubs c on lower(trim(c.name)) = lower(trim(p.club))
  where coalesce(trim(p.club), '') <> ''
  group by tm.team_id, c.id
),
best_club_per_team as (
  select team_id, club_id,
         row_number() over (partition by team_id order by votes desc) as rn
  from team_club_votes
)
update public.teams t
set club_id = b.club_id
from best_club_per_team b
where b.team_id = t.id and b.rn = 1;


-- ---------------------------------------------------------------------
-- 2. club_members — rôles club-level (admin, dirigeant, coach)
-- ---------------------------------------------------------------------

create table public.club_members (
  club_id uuid not null,
  user_id uuid not null,
  role text not null default 'coach',
  created_at timestamp with time zone default now() not null
);

alter table public.club_members add constraint club_members_pkey primary key (club_id, user_id);
alter table public.club_members add constraint club_members_role_check
  check (role = any (array['admin'::text, 'dirigeant'::text, 'coach'::text]));
alter table public.club_members add constraint club_members_club_id_fkey
  foreign key (club_id) references public.clubs(id) on delete cascade;
alter table public.club_members add constraint club_members_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
create index club_members_user_id_idx on public.club_members (user_id);

-- Continuité : les admins d'équipe actuels (teams.admin_id) deviennent
-- admins du club de leur équipe, s'il a pu être résolu ci-dessus.
insert into public.club_members (club_id, user_id, role)
select distinct t.club_id, t.admin_id, 'admin'
from public.teams t
where t.club_id is not null and t.admin_id is not null
on conflict (club_id, user_id) do nothing;


-- ---------------------------------------------------------------------
-- 3. club_invites — codes d'invitation coach/dirigeant, usage unique
-- ---------------------------------------------------------------------

create table public.club_invites (
  id uuid default gen_random_uuid() not null,
  club_id uuid not null,
  code text not null,
  role text not null default 'coach',
  created_by uuid not null,
  created_at timestamp with time zone default now() not null,
  expires_at timestamp with time zone not null default (now() + interval '7 days'),
  used_at timestamp with time zone,
  used_by uuid
);

alter table public.club_invites add constraint club_invites_pkey primary key (id);
alter table public.club_invites add constraint club_invites_code_key unique (code);
alter table public.club_invites add constraint club_invites_role_check
  check (role = any (array['admin'::text, 'dirigeant'::text, 'coach'::text]));
alter table public.club_invites add constraint club_invites_club_id_fkey
  foreign key (club_id) references public.clubs(id) on delete cascade;
alter table public.club_invites add constraint club_invites_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete cascade;
alter table public.club_invites add constraint club_invites_used_by_fkey
  foreign key (used_by) references auth.users(id) on delete set null;
create index club_invites_club_id_idx on public.club_invites (club_id);


-- ---------------------------------------------------------------------
-- 4. Fonctions SECURITY DEFINER
-- ---------------------------------------------------------------------

-- Vrai si l'appelant est admin/dirigeant du club propriétaire de l'équipe
-- donnée (accès club-level), ou admin plateforme (accès global existant).
CREATE OR REPLACE FUNCTION public.is_club_manager(check_team_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from teams t
    join club_members cm on cm.club_id = t.club_id
    where t.id = check_team_id
      and cm.user_id = auth.uid()
      and cm.role in ('admin', 'dirigeant')
  );
$function$;

-- Génère un code d'invitation club-level. Réservé aux admins/dirigeants
-- du club concerné (ou admin plateforme). Le rôle proposé ne peut pas
-- être 'admin' pour un simple dirigeant : seul un admin du club peut
-- inviter un autre admin.
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

  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
     AND caller_role IS DISTINCT FROM 'admin'
     AND NOT (caller_role = 'dirigeant' AND p_role <> 'admin') THEN
    RAISE EXCEPTION 'Accès refusé : réservé aux administrateurs ou dirigeants du club';
  END IF;

  new_code := encode(gen_random_bytes(9), 'base64');
  new_code := replace(replace(replace(new_code, '/', '_'), '+', '-'), '=', '');

  INSERT INTO public.club_invites (club_id, code, role, created_by, expires_at)
  VALUES (p_club_id, new_code, p_role, auth.uid(), now() + (p_expires_in_days || ' days')::interval);

  RETURN new_code;
END;
$function$;

-- Consomme un code d'invitation club-level : ajoute l'appelant dans
-- club_members avec le rôle du code, puis invalide le code (usage unique).
CREATE OR REPLACE FUNCTION public.redeem_club_invite(p_code text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  inv record;
BEGIN
  SELECT * INTO inv FROM public.club_invites WHERE code = p_code FOR UPDATE;

  IF inv IS NULL THEN
    RAISE EXCEPTION 'Code d''invitation invalide';
  END IF;
  IF inv.used_at IS NOT NULL THEN
    RAISE EXCEPTION 'Ce code d''invitation a déjà été utilisé';
  END IF;
  IF inv.expires_at < now() THEN
    RAISE EXCEPTION 'Ce code d''invitation a expiré';
  END IF;

  INSERT INTO public.club_members (club_id, user_id, role)
  VALUES (inv.club_id, auth.uid(), inv.role)
  ON CONFLICT (club_id, user_id) DO UPDATE SET role = excluded.role;

  UPDATE public.club_invites SET used_at = now(), used_by = auth.uid() WHERE id = inv.id;

  RETURN inv.club_id;
END;
$function$;

revoke execute on function public.is_club_manager(uuid) from public, anon;
revoke execute on function public.create_club_invite(uuid, text, int) from public, anon;
revoke execute on function public.redeem_club_invite(text) from public, anon;

grant execute on function public.is_club_manager(uuid) to authenticated;
grant execute on function public.create_club_invite(uuid, text, int) to authenticated;
grant execute on function public.redeem_club_invite(text) to authenticated;


-- ---------------------------------------------------------------------
-- 5. Row Level Security
-- ---------------------------------------------------------------------

alter table public.club_members enable row level security;
alter table public.club_invites enable row level security;

-- club_members
create policy self_read_club_membership on public.club_members as PERMISSIVE for SELECT to public
  using (user_id = (select auth.uid()));

create policy club_admins_manage_club_members on public.club_members as PERMISSIVE for ALL to public
  using (
    exists (select 1 from public.admins where user_id = (select auth.uid()))
    or exists (
      select 1 from public.club_members cm
      where cm.club_id = club_members.club_id
        and cm.user_id = (select auth.uid())
        and cm.role = 'admin'
    )
  );

-- club_invites : jamais lisibles publiquement (le code seul doit suffire
-- côté redeem_club_invite, en SECURITY DEFINER) ; seuls les admins/dirigeants
-- du club voient/gèrent les invitations de leur propre club.
create policy club_managers_manage_club_invites on public.club_invites as PERMISSIVE for ALL to public
  using (
    exists (select 1 from public.admins where user_id = (select auth.uid()))
    or exists (
      select 1 from public.club_members cm
      where cm.club_id = club_invites.club_id
        and cm.user_id = (select auth.uid())
        and cm.role in ('admin', 'dirigeant')
    )
  );

-- teams : les admins/dirigeants de club gèrent les équipes de leur club
create policy club_managers_manage_teams on public.teams as PERMISSIVE for ALL to public
  using (
    club_id is not null
    and exists (
      select 1 from public.club_members cm
      where cm.club_id = teams.club_id
        and cm.user_id = (select auth.uid())
        and cm.role in ('admin', 'dirigeant')
    )
  );

-- team_members : les admins/dirigeants de club gèrent les membres des
-- équipes de leur club (ajout/retrait, ex. affectation d'un coach)
create policy club_managers_manage_team_members on public.team_members as PERMISSIVE for ALL to public
  using (is_club_manager(team_id));

-- managed_players
create policy club_managers_manage_managed_players on public.managed_players as PERMISSIVE for ALL to public
  using (is_club_manager(team_id));

-- mesures (joueurs suivis "fantômes" + joueurs avec compte, de tout le club)
create policy club_managers_manage_managed_player_mesures on public.mesures as PERMISSIVE for ALL to public
  using (
    managed_player_id is not null
    and exists (
      select 1 from public.managed_players mp
      where mp.id = mesures.managed_player_id and is_club_manager(mp.team_id)
    )
  );

create policy club_managers_manage_player_mesures on public.mesures as PERMISSIVE for ALL to public
  using (
    user_id is not null
    and exists (
      select 1 from public.team_members tm
      where tm.user_id = mesures.user_id and is_club_manager(tm.team_id)
    )
  );

-- seances
create policy club_managers_manage_seances on public.seances as PERMISSIVE for ALL to public
  using (
    team_id is not null and is_club_manager(team_id)
  );

-- team_daily_sessions
create policy club_managers_manage_team_daily_sessions on public.team_daily_sessions as PERMISSIVE for ALL to public
  using (is_club_manager(team_id));

-- profils : lecture seule, pour les admins/dirigeants du club des équipes
-- où le joueur est membre (nécessaire pour voir/gérer le club depuis l'admin)
create policy club_managers_read_profiles on public.profils as PERMISSIVE for SELECT to public
  using (
    exists (
      select 1 from public.team_members tm
      where tm.user_id = profils.user_id and is_club_manager(tm.team_id)
    )
  );
