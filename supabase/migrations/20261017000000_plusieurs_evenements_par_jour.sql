-- Plusieurs événements par jour et par équipe (ex. deux matchs le même jour) : la contrainte
-- d'unicité (équipe, date) est supprimée. Un index non unique la remplace pour les recherches.
alter table public.team_daily_sessions drop constraint if exists team_daily_sessions_team_id_date_key;
create index if not exists team_daily_sessions_team_id_date_idx on public.team_daily_sessions (team_id, date);
