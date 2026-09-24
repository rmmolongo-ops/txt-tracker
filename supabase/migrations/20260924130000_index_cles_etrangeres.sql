-- Index sur les clés étrangères non couvertes (alerte « unindexed_foreign_keys » de Supabase).
-- Accélère les filtres par joueur / équipe utilisés par l'appli et les règles d'accès (RLS),
-- ainsi que les suppressions en cascade. Ajout pur : aucune donnée modifiée.

-- Filtres les plus fréquents (appli et RLS)
create index if not exists mesures_user_id_idx on public.mesures (user_id);
create index if not exists mesures_managed_player_id_idx on public.mesures (managed_player_id);
create index if not exists team_members_user_id_idx on public.team_members (user_id);
create index if not exists managed_players_team_id_idx on public.managed_players (team_id);
create index if not exists seances_team_id_idx on public.seances (team_id);
create index if not exists team_programs_team_id_idx on public.team_programs (team_id);
create index if not exists chat_reads_team_id_idx on public.chat_reads (team_id);
-- Tchat : messages d'une équipe triés par date, et comptage des non-lus (created_at > dernier passage)
create index if not exists team_messages_team_id_created_at_idx on public.team_messages (team_id, created_at);
create index if not exists team_messages_user_id_idx on public.team_messages (user_id);

-- Colonnes « créé par » / références secondaires (suppressions en cascade, requêtes admin)
create index if not exists seances_validated_by_idx on public.seances (validated_by);
create index if not exists teams_admin_id_idx on public.teams (admin_id);
create index if not exists managed_players_created_by_idx on public.managed_players (created_by);
create index if not exists seance_templates_created_by_idx on public.seance_templates (created_by);
create index if not exists team_daily_sessions_created_by_idx on public.team_daily_sessions (created_by);
create index if not exists team_daily_sessions_template_id_idx on public.team_daily_sessions (template_id);
