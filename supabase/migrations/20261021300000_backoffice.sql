-- Back-office (/backoffice) : lecture globale réservée au super admin (table admins).
-- L'adresse dédiée n'est pas une protection : chaque fonction renvoie un résultat vide pour
-- tout autre utilisateur. Les fonctions lisent auth.users (emails, dates de connexion), d'où
-- SECURITY DEFINER ; rien n'est exposé aux visiteurs non connectés.

create or replace function public.is_super_admin()
 returns boolean
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  select exists (select 1 from public.admins where user_id = auth.uid());
$function$;

revoke execute on function public.is_super_admin() from public, anon;
grant execute on function public.is_super_admin() to authenticated;

-- ---------------------------------------------------------------------
-- Comptes : identité, état de l'email, équipes et rôles, activité
-- ---------------------------------------------------------------------
create or replace function public.backoffice_users()
 returns table (
   user_id uuid, email text, created_at timestamptz, email_confirmed_at timestamptz, last_sign_in_at timestamptz,
   provider text, prenom text, nom text, photo_url text, is_super_admin boolean,
   equipes jsonb, clubs jsonb, nb_mesures bigint, derniere_activite date
 )
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  select
    u.id, u.email::text, u.created_at, u.email_confirmed_at, u.last_sign_in_at,
    coalesce(u.raw_app_meta_data->>'provider', 'email'),
    p.prenom, p.nom, p.photo_url,
    exists (select 1 from public.admins a where a.user_id = u.id),
    coalesce((
      select jsonb_agg(jsonb_build_object('team_id', t.id, 'team', t.name, 'club', c.name, 'role', tm.role) order by c.name, t.name)
      from public.team_members tm join public.teams t on t.id = tm.team_id left join public.clubs c on c.id = t.club_id
      where tm.user_id = u.id
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object('club', c.name, 'role', cm.role) order by c.name)
      from public.club_members cm join public.clubs c on c.id = cm.club_id
      where cm.user_id = u.id
    ), '[]'::jsonb),
    (select count(*) from public.mesures m where m.user_id = u.id),
    greatest(
      (select max(m.date) from public.mesures m where m.user_id = u.id),
      (select max(s.date) from public.seances s where s.user_id = u.id),
      (select max(tmsg.created_at)::date from public.team_messages tmsg where tmsg.user_id = u.id)
    )
  from auth.users u
  left join public.profils p on p.user_id = u.id
  where public.is_super_admin()
  order by u.created_at desc;
$function$;

revoke execute on function public.backoffice_users() from public, anon;
grant execute on function public.backoffice_users() to authenticated;

-- ---------------------------------------------------------------------
-- Vue globale : clubs, administrateurs, équipes, effectifs, staff, activité
-- ---------------------------------------------------------------------
create or replace function public.backoffice_clubs()
 returns jsonb
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  with personne as (
    select u.id, coalesce(nullif(trim(coalesce(p.prenom, '') || ' ' || coalesce(p.nom, '')), ''), u.email::text) as nom
    from auth.users u left join public.profils p on p.user_id = u.id
  ),
  equipe as (
    select t.id, t.club_id, jsonb_build_object(
      'id', t.id, 'name', t.name, 'color', t.color,
      'joueurs', (select count(*) from public.team_members tm where tm.team_id = t.id and tm.role in ('joueur', 'capitaine', 'invite')),
      'sans_compte', (select count(*) from public.managed_players mp where mp.team_id = t.id),
      'staff', coalesce((
        select jsonb_agg(jsonb_build_object('nom', pe.nom, 'role', tm.role) order by tm.role, pe.nom)
        from public.team_members tm join personne pe on pe.id = tm.user_id
        where tm.team_id = t.id and tm.role in ('coach', 'dirigeant')
      ), '[]'::jsonb),
      'mesures_30j', (
        select count(*) from public.mesures m
        where m.date > current_date - 30
          and (m.user_id in (select tm.user_id from public.team_members tm where tm.team_id = t.id)
               or m.managed_player_id in (select mp.id from public.managed_players mp where mp.team_id = t.id))
      ),
      'evenements_30j', (select count(*) from public.team_daily_sessions d where d.team_id = t.id and d.date > current_date - 30 and d.date <= current_date),
      'derniere_activite', greatest(
        (select max(d.date) from public.team_daily_sessions d where d.team_id = t.id and d.date <= current_date),
        (select max(m.date) from public.mesures m where m.user_id in (select tm.user_id from public.team_members tm where tm.team_id = t.id))
      )
    ) as data
    from public.teams t
  )
  select coalesce(jsonb_agg(club order by club->>'name'), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'id', c.id, 'name', c.name,
      'admins', coalesce((
        select jsonb_agg(pe.nom order by pe.nom)
        from public.club_members cm join personne pe on pe.id = cm.user_id
        where cm.club_id = c.id and cm.role = 'admin'
      ), '[]'::jsonb),
      'teams', coalesce((select jsonb_agg(e.data order by e.data->>'name') from equipe e where e.club_id = c.id), '[]'::jsonb)
    ) as club
    from public.clubs c
    union all
    select jsonb_build_object('id', null, 'name', 'Sans club', 'admins', '[]'::jsonb,
      'teams', jsonb_agg(e.data order by e.data->>'name'))
    from equipe e where e.club_id is null
    having count(*) > 0
  ) x
  where public.is_super_admin();
$function$;

revoke execute on function public.backoffice_clubs() from public, anon;
grant execute on function public.backoffice_clubs() to authenticated;

-- ---------------------------------------------------------------------
-- Statistiques : totaux et séries hebdomadaires (calculées depuis la base, sans traceur externe)
-- ---------------------------------------------------------------------
-- « Actifs » = utilisateurs ayant saisi une mesure, une séance ou un message dans la période
-- (la base ne garde que la dernière connexion, pas l'historique des connexions).
create or replace function public.backoffice_stats(p_weeks integer default 12)
 returns jsonb
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  with semaines as (
    select gs::date as debut
    from generate_series(
      date_trunc('week', current_date) - ((least(greatest(coalesce(p_weeks, 12), 4), 52) - 1) || ' weeks')::interval,
      date_trunc('week', current_date),
      interval '1 week'
    ) gs
  ),
  actifs_30j as (
    select user_id from public.mesures where date > current_date - 30 and user_id is not null
    union select user_id from public.seances where date > current_date - 30
    union select user_id from public.team_messages where created_at > now() - interval '30 days'
  )
  select jsonb_build_object(
    'totaux', jsonb_build_object(
      'comptes', (select count(*) from auth.users),
      'non_confirmes', (select count(*) from auth.users where email_confirmed_at is null),
      'actifs_30j', (select count(*) from actifs_30j),
      'clubs', (select count(*) from public.clubs),
      'equipes', (select count(*) from public.teams),
      'sans_compte', (select count(*) from public.managed_players),
      'mesures', (select count(*) from public.mesures),
      'evenements', (select count(*) from public.team_daily_sessions),
      'erreurs_7j', (select count(*) from public.client_errors where created_at > now() - interval '7 days')
    ),
    'semaines', (
      select jsonb_agg(jsonb_build_object(
        'debut', s.debut,
        'inscriptions', (select count(*) from auth.users u where u.created_at >= s.debut and u.created_at < s.debut + 7),
        'actifs', (
          select count(*) from (
            select user_id from public.mesures where date >= s.debut and date < s.debut + 7 and user_id is not null
            union select user_id from public.seances where date >= s.debut and date < s.debut + 7
            union select user_id from public.team_messages where created_at >= s.debut and created_at < s.debut + 7
          ) a
        ),
        'mesures', (select count(*) from public.mesures where date >= s.debut and date < s.debut + 7),
        'seances', (select count(*) from public.seances where date >= s.debut and date < s.debut + 7),
        'evenements', (select count(*) from public.team_daily_sessions where date >= s.debut and date < s.debut + 7),
        'messages', (select count(*) from public.team_messages where created_at >= s.debut and created_at < s.debut + 7)
      ) order by s.debut)
      from semaines s
    )
  )
  where public.is_super_admin();
$function$;

revoke execute on function public.backoffice_stats(integer) from public, anon;
grant execute on function public.backoffice_stats(integer) to authenticated;

-- ---------------------------------------------------------------------
-- Suppression de compte : interdite sur son propre compte (et donc sur le super admin connecté)
-- ---------------------------------------------------------------------
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
  if target_user_id = auth.uid() then
    raise exception 'Tu ne peux pas supprimer ton propre compte';
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
