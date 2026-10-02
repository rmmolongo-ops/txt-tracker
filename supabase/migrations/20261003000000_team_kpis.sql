-- Indicateurs de performance définis par équipe : chaque coach/dirigeant ajoute, modifie,
-- archive les indicateurs de son équipe (au lieu de la liste fixe codée en dur dans l'appli).
--
-- `key` est la valeur stockée dans mesures.kpi_id : les 10 indicateurs historiques gardent
-- leurs clés d'origine (sprint30, jonglerie_g…), donc les mesures existantes restent rattachées.
-- Un indicateur supprimé est archivé (archived_at) : ses mesures sont conservées et il peut
-- être restauré.

create table public.team_kpis (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  key text not null,
  label text not null check (char_length(btrim(label)) between 1 and 40),
  kind text not null check (kind in ('temps', 'distance', 'nombre', 'note')),
  unit text not null check (char_length(btrim(unit)) between 1 and 20),
  max_value numeric,
  decimals boolean not null default false,
  lower_is_better boolean not null default false,
  category text not null default 'physique' check (category in ('physique', 'technique', 'mental')),
  position integer not null default 0,
  archived_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint team_kpis_team_key_unique unique (team_id, key),
  constraint team_kpis_note_max check (kind <> 'note' or max_value in (10, 20))
);

create index team_kpis_team_id_idx on public.team_kpis (team_id);

alter table public.team_kpis enable row level security;

create policy team_members_read_team_kpis on public.team_kpis as PERMISSIVE for SELECT to authenticated
  using (public.is_team_member(team_id) or public.is_club_manager(team_id)
         or exists (select 1 from public.admins where user_id = (select auth.uid())));

create policy team_leaders_manage_team_kpis on public.team_kpis as PERMISSIVE for ALL to authenticated
  using (
    exists (
      select 1 from public.team_members tm
      where tm.team_id = team_kpis.team_id and tm.user_id = (select auth.uid()) and tm.role in ('coach', 'dirigeant')
    )
    or public.is_club_manager(team_id)
    or exists (select 1 from public.admins where user_id = (select auth.uid()))
  )
  with check (
    exists (
      select 1 from public.team_members tm
      where tm.team_id = team_kpis.team_id and tm.user_id = (select auth.uid()) and tm.role in ('coach', 'dirigeant')
    )
    or public.is_club_manager(team_id)
    or exists (select 1 from public.admins where user_id = (select auth.uid()))
  );

-- Indicateurs par défaut (ceux de l'appli jusqu'ici), copiés dans chaque équipe.
create or replace function public.seed_default_team_kpis(p_team_id uuid)
 returns void
 language sql
 security definer
 set search_path to 'public'
as $function$
  insert into public.team_kpis (team_id, key, label, kind, unit, max_value, decimals, lower_is_better, category, position)
  values
    (p_team_id, 'sprint30', 'Sprint 30m', 'temps', 'sec', null, true, true, 'physique', 1),
    (p_team_id, 'sprint10', 'Sprint 10m', 'temps', 'sec', null, true, true, 'physique', 2),
    (p_team_id, 'jonglerie_g', 'Jonglerie Gauche', 'nombre', 'touches', null, false, false, 'technique', 3),
    (p_team_id, 'jonglerie_d', 'Jonglerie Droite', 'nombre', 'touches', null, false, false, 'technique', 4),
    (p_team_id, 'jonglerie_alt', 'Jonglerie Alternée', 'nombre', 'touches', null, false, false, 'technique', 5),
    (p_team_id, 'precision', 'Précision Frappe', 'note', '/10', 10, true, false, 'technique', 6),
    (p_team_id, 'slalom', 'Slalom 20m', 'temps', 'sec', null, true, true, 'technique', 7),
    (p_team_id, 'scan', 'Scan Ballon/Mvt', 'note', '/10', 10, true, false, 'technique', 8),
    (p_team_id, 'motivation', 'Motivation', 'note', '/10', 10, true, false, 'mental', 9),
    (p_team_id, 'sommeil', 'Qualité Sommeil', 'note', '/10', 10, true, false, 'mental', 10)
  on conflict (team_id, key) do nothing;
$function$;

revoke execute on function public.seed_default_team_kpis(uuid) from public, anon, authenticated;

create or replace function public.seed_team_kpis_on_team_insert()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  perform public.seed_default_team_kpis(new.id);
  return new;
end;
$function$;

revoke execute on function public.seed_team_kpis_on_team_insert() from public, anon, authenticated;

create trigger teams_seed_default_kpis after insert on public.teams
  for each row execute function public.seed_team_kpis_on_team_insert();

-- Équipes existantes
select public.seed_default_team_kpis(id) from public.teams;
