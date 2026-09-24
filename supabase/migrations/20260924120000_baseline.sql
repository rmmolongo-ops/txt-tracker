-- =====================================================================
-- TxT Tracker — schéma de référence (baseline)
-- Photo du schéma de production (projet Supabase « TxT_tracker ») au 24/09/2026.
--
-- Rejouer ce fichier sur une base Supabase vide recrée toute la structure :
-- tables, contraintes, fonctions, règles d'accès (RLS), stockage et temps réel.
-- Les modifications suivantes s'ajoutent dans de nouveaux fichiers de ce dossier
-- (voir supabase/README.md). Ne pas modifier ce fichier après coup.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

create table public.admins (
  user_id uuid not null,
  created_at timestamp with time zone default now()
);

create table public.chat_reads (
  user_id uuid not null,
  team_id uuid not null,
  last_read_at timestamp with time zone default now() not null
);

create table public.clubs (
  id uuid default gen_random_uuid() not null,
  name text not null,
  created_at timestamp with time zone default now() not null
);

create table public.managed_players (
  id uuid default gen_random_uuid() not null,
  team_id uuid not null,
  nom text default ''::text,
  prenom text default ''::text,
  surnom text default 'TxT'::text,
  poste1 text default ''::text,
  poste2 text default ''::text,
  photo_url text default ''::text,
  created_by uuid,
  created_at timestamp with time zone default now()
);

create table public.mesures (
  id uuid default gen_random_uuid() not null,
  user_id uuid,
  kpi_id text not null,
  valeur numeric not null,
  date date default CURRENT_DATE not null,
  created_at timestamp with time zone default now(),
  managed_player_id uuid
);

create table public.profils (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  nom text default ''::text,
  prenom text default ''::text,
  surnom text default 'TxT'::text,
  club text default ''::text,
  division text default ''::text,
  poste1 text default ''::text,
  poste2 text default ''::text,
  photo_url text default ''::text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  dashboard_kpis jsonb
);

create table public.seance_templates (
  id uuid default gen_random_uuid() not null,
  created_by uuid not null,
  label text not null,
  icon text default '💪'::text,
  color text default '#3b82f6'::text,
  duration text default '1h'::text,
  objectif text default ''::text,
  blocs jsonb default '[]'::jsonb not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table public.seances (
  id uuid default gen_random_uuid() not null,
  user_id uuid,
  jour text not null,
  date date default CURRENT_DATE not null,
  validee boolean default true,
  created_at timestamp with time zone default now(),
  team_id uuid,
  validated_by uuid,
  managed_player_id uuid
);

create table public.team_daily_sessions (
  id uuid default gen_random_uuid() not null,
  team_id uuid not null,
  date date not null,
  template_id uuid,
  label text not null,
  icon text default '💪'::text,
  color text default '#3b82f6'::text,
  duration text default ''::text,
  objectif text default ''::text,
  blocs jsonb default '[]'::jsonb not null,
  created_by uuid,
  created_at timestamp with time zone default now(),
  note_coach text,
  rating_deroule smallint,
  rating_ressenti smallint,
  type text default 'entrainement'::text not null,
  resultat text,
  buts jsonb default '{}'::jsonb not null,
  score_pour smallint,
  score_contre smallint,
  presents jsonb default '[]'::jsonb not null
);

create table public.team_members (
  team_id uuid not null,
  user_id uuid not null,
  created_at timestamp with time zone default now(),
  role text default 'joueur'::text not null
);

create table public.team_messages (
  id uuid default gen_random_uuid() not null,
  team_id uuid not null,
  user_id uuid not null,
  content text not null,
  sender_prenom text default ''::text,
  sender_nom text default ''::text,
  sender_surnom text default ''::text,
  sender_photo_url text default ''::text,
  created_at timestamp with time zone default now() not null
);

create table public.team_programs (
  id uuid default gen_random_uuid() not null,
  team_id uuid not null,
  name text default 'Programme'::text not null,
  sessions jsonb not null,
  start_date date not null,
  end_date date not null,
  created_at timestamp with time zone default now() not null
);

create table public.teams (
  id uuid default gen_random_uuid() not null,
  name text not null,
  admin_id uuid,
  color text default '#3b82f6'::text,
  created_at timestamp with time zone default now(),
  photo_url text,
  program jsonb,
  dashboard_kpis jsonb
);


-- ---------------------------------------------------------------------
-- Clés primaires, contraintes d'unicité et de validation
-- ---------------------------------------------------------------------

alter table public.admins add constraint admins_pkey PRIMARY KEY (user_id);
alter table public.chat_reads add constraint chat_reads_pkey PRIMARY KEY (user_id, team_id);
alter table public.clubs add constraint clubs_pkey PRIMARY KEY (id);
alter table public.clubs add constraint clubs_name_key UNIQUE (name);
alter table public.managed_players add constraint managed_players_pkey PRIMARY KEY (id);
alter table public.mesures add constraint mesures_pkey PRIMARY KEY (id);
alter table public.mesures add constraint mesures_owner_check CHECK ((num_nonnulls(user_id, managed_player_id) = 1));
alter table public.profils add constraint profils_pkey PRIMARY KEY (id);
alter table public.profils add constraint profils_user_id_key UNIQUE (user_id);
alter table public.seance_templates add constraint seance_templates_pkey PRIMARY KEY (id);
alter table public.seances add constraint seances_pkey PRIMARY KEY (id);
alter table public.seances add constraint seances_user_id_jour_date_team_key UNIQUE (user_id, jour, date, team_id);
alter table public.seances add constraint seances_owner_check CHECK ((num_nonnulls(user_id, managed_player_id) = 1));
alter table public.team_daily_sessions add constraint team_daily_sessions_pkey PRIMARY KEY (id);
alter table public.team_daily_sessions add constraint team_daily_sessions_team_id_date_key UNIQUE (team_id, date);
alter table public.team_daily_sessions add constraint team_daily_sessions_rating_deroule_check CHECK (((rating_deroule >= 1) AND (rating_deroule <= 5)));
alter table public.team_daily_sessions add constraint team_daily_sessions_rating_ressenti_check CHECK (((rating_ressenti >= 1) AND (rating_ressenti <= 5)));
alter table public.team_daily_sessions add constraint team_daily_sessions_resultat_check CHECK ((resultat = ANY (ARRAY['victoire'::text, 'defaite'::text, 'nul'::text])));
alter table public.team_daily_sessions add constraint team_daily_sessions_score_contre_check CHECK ((score_contre >= 0));
alter table public.team_daily_sessions add constraint team_daily_sessions_score_pour_check CHECK ((score_pour >= 0));
alter table public.team_daily_sessions add constraint team_daily_sessions_type_check CHECK ((type = ANY (ARRAY['entrainement'::text, 'match'::text])));
alter table public.team_members add constraint team_members_pkey PRIMARY KEY (team_id, user_id);
alter table public.team_members add constraint team_members_role_check CHECK ((role = ANY (ARRAY['joueur'::text, 'coach'::text, 'dirigeant'::text, 'invite'::text, 'capitaine'::text])));
alter table public.team_messages add constraint team_messages_pkey PRIMARY KEY (id);
alter table public.team_programs add constraint team_programs_pkey PRIMARY KEY (id);
alter table public.team_programs add constraint team_programs_dates_check CHECK ((end_date >= start_date));
alter table public.teams add constraint teams_pkey PRIMARY KEY (id);


-- ---------------------------------------------------------------------
-- Clés étrangères
-- ---------------------------------------------------------------------

alter table public.admins add constraint admins_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.chat_reads add constraint chat_reads_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
alter table public.chat_reads add constraint chat_reads_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.managed_players add constraint managed_players_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
alter table public.managed_players add constraint managed_players_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
alter table public.mesures add constraint mesures_managed_player_id_fkey FOREIGN KEY (managed_player_id) REFERENCES public.managed_players(id) ON DELETE CASCADE;
alter table public.mesures add constraint mesures_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.profils add constraint profils_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.seance_templates add constraint seance_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.seances add constraint seances_managed_player_id_fkey FOREIGN KEY (managed_player_id) REFERENCES public.managed_players(id) ON DELETE CASCADE;
alter table public.seances add constraint seances_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
alter table public.seances add constraint seances_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.seances add constraint seances_validated_by_fkey FOREIGN KEY (validated_by) REFERENCES auth.users(id);
alter table public.team_daily_sessions add constraint team_daily_sessions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
alter table public.team_daily_sessions add constraint team_daily_sessions_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
alter table public.team_daily_sessions add constraint team_daily_sessions_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.seance_templates(id) ON DELETE SET NULL;
alter table public.team_members add constraint team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
alter table public.team_members add constraint team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.team_messages add constraint team_messages_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
alter table public.team_messages add constraint team_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.team_programs add constraint team_programs_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
alter table public.teams add constraint teams_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES auth.users(id) ON DELETE CASCADE;


-- ---------------------------------------------------------------------
-- Index
-- ---------------------------------------------------------------------

CREATE UNIQUE INDEX seances_unique_managed ON public.seances USING btree (managed_player_id, jour, date, team_id) WHERE (managed_player_id IS NOT NULL);
CREATE UNIQUE INDEX seances_unique_user ON public.seances USING btree (user_id, jour, date, team_id) WHERE (user_id IS NOT NULL);


-- ---------------------------------------------------------------------
-- Fonctions (SECURITY DEFINER : réservées aux utilisateurs connectés)
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.delete_user_as_admin(target_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Accès refusé : réservé aux administrateurs';
  END IF;

  DELETE FROM public.mesures WHERE user_id = target_user_id;
  DELETE FROM public.seances WHERE user_id = target_user_id;
  DELETE FROM public.profils WHERE user_id = target_user_id;
  DELETE FROM public.admins  WHERE user_id = target_user_id;
  DELETE FROM auth.users     WHERE id = target_user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_unconfirmed_signups_for_admins()
 RETURNS TABLE(user_id uuid, email text, created_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select au.id as user_id, au.email, au.created_at
  from auth.users au
  where au.email_confirmed_at is null
    and exists (select 1 from public.admins a where a.user_id = auth.uid())
  order by au.created_at desc;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_emails_for_admins()
 RETURNS TABLE(user_id uuid, email text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT au.id AS user_id, au.email
  FROM auth.users au
  WHERE EXISTS (
    SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM admins WHERE user_id = uid);
$function$;

CREATE OR REPLACE FUNCTION public.is_team_member(check_team_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from team_members
    where team_id = check_team_id and user_id = auth.uid()
  );
$function$;

revoke execute on function public.delete_user_as_admin(uuid) from public, anon;
revoke execute on function public.get_unconfirmed_signups_for_admins() from public, anon;
revoke execute on function public.get_user_emails_for_admins() from public, anon;
revoke execute on function public.is_admin(uuid) from public, anon;
revoke execute on function public.is_team_member(uuid) from public, anon;

grant execute on function public.delete_user_as_admin(uuid) to authenticated;
grant execute on function public.get_unconfirmed_signups_for_admins() to authenticated;
grant execute on function public.get_user_emails_for_admins() to authenticated;
grant execute on function public.is_admin(uuid) to authenticated;
grant execute on function public.is_team_member(uuid) to authenticated;


-- ---------------------------------------------------------------------
-- Vue (inutilisée par l'appli, fermée à tous les rôles de l'API)
-- ---------------------------------------------------------------------

create view public.admin_dashboard with (security_invoker = on) as
 SELECT p.user_id,
    p.prenom,
    p.nom,
    p.surnom,
    p.club,
    p.division,
    p.poste1,
    p.photo_url,
    count(DISTINCT m.id) AS nb_mesures,
    count(DISTINCT s.id) AS nb_seances,
    max(s.date) AS derniere_seance
   FROM ((profils p
     LEFT JOIN mesures m ON ((m.user_id = p.user_id)))
     LEFT JOIN seances s ON ((s.user_id = p.user_id)))
  GROUP BY p.user_id, p.prenom, p.nom, p.surnom, p.club, p.division, p.poste1, p.photo_url;

revoke all on public.admin_dashboard from anon, authenticated, public;


-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------

alter table public.admins enable row level security;
alter table public.chat_reads enable row level security;
alter table public.clubs enable row level security;
alter table public.managed_players enable row level security;
alter table public.mesures enable row level security;
alter table public.profils enable row level security;
alter table public.seance_templates enable row level security;
alter table public.seances enable row level security;
alter table public.team_daily_sessions enable row level security;
alter table public.team_members enable row level security;
alter table public.team_messages enable row level security;
alter table public.team_programs enable row level security;
alter table public.teams enable row level security;

-- admins
create policy "Admins peuvent se voir" on public.admins as PERMISSIVE for SELECT to public
  using ((auth.uid() = user_id));

-- chat_reads
create policy users_manage_own_chat_reads on public.chat_reads as PERMISSIVE for ALL to public
  using ((user_id = auth.uid()));

-- clubs
create policy admins_manage_clubs on public.clubs as PERMISSIVE for ALL to public
  using ((EXISTS ( SELECT 1
   FROM admins
  WHERE (admins.user_id = auth.uid()))));

create policy public_read_clubs on public.clubs as PERMISSIVE for SELECT to public
  using (true);

-- managed_players
create policy admin_manage_managed_players on public.managed_players as PERMISSIVE for ALL to public
  using ((EXISTS ( SELECT 1
   FROM admins
  WHERE (admins.user_id = auth.uid()))));

create policy coach_manage_own_team_managed_players on public.managed_players as PERMISSIVE for ALL to public
  using ((EXISTS ( SELECT 1
   FROM team_members tm
  WHERE ((tm.user_id = auth.uid()) AND (tm.team_id = managed_players.team_id) AND (tm.role = ANY (ARRAY['coach'::text, 'dirigeant'::text]))))))
  with check ((EXISTS ( SELECT 1
   FROM team_members tm
  WHERE ((tm.user_id = auth.uid()) AND (tm.team_id = managed_players.team_id) AND (tm.role = ANY (ARRAY['coach'::text, 'dirigeant'::text]))))));

create policy teammates_read_managed_players on public.managed_players as PERMISSIVE for SELECT to public
  using ((EXISTS ( SELECT 1
   FROM team_members tm
  WHERE ((tm.user_id = auth.uid()) AND (tm.team_id = managed_players.team_id)))));

-- mesures
create policy "Accès mesures personnelles" on public.mesures as PERMISSIVE for ALL to public
  using ((auth.uid() = user_id));

create policy "Admin supprime les mesures" on public.mesures as PERMISSIVE for DELETE to public
  using ((EXISTS ( SELECT 1
   FROM admins
  WHERE (admins.user_id = auth.uid()))));

create policy "Admin voit toutes les mesures" on public.mesures as PERMISSIVE for SELECT to public
  using ((EXISTS ( SELECT 1
   FROM admins
  WHERE (admins.user_id = auth.uid()))));

create policy coach_manage_team_mesures on public.mesures as PERMISSIVE for ALL to public
  using (((managed_player_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM (managed_players mp
     JOIN team_members tm ON ((tm.team_id = mp.team_id)))
  WHERE ((mp.id = mesures.managed_player_id) AND (tm.user_id = auth.uid()) AND (tm.role = ANY (ARRAY['coach'::text, 'dirigeant'::text])))))))
  with check (((managed_player_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM (managed_players mp
     JOIN team_members tm ON ((tm.team_id = mp.team_id)))
  WHERE ((mp.id = mesures.managed_player_id) AND (tm.user_id = auth.uid()) AND (tm.role = ANY (ARRAY['coach'::text, 'dirigeant'::text])))))));

create policy coach_manage_team_player_mesures on public.mesures as PERMISSIVE for ALL to public
  using (((user_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM team_members tm_coach
  WHERE ((tm_coach.user_id = auth.uid()) AND (tm_coach.role = ANY (ARRAY['coach'::text, 'dirigeant'::text]))))) AND (EXISTS ( SELECT 1
   FROM (team_members tm_coach
     JOIN team_members tm_player ON ((tm_player.team_id = tm_coach.team_id)))
  WHERE ((tm_coach.user_id = auth.uid()) AND (tm_coach.role = ANY (ARRAY['coach'::text, 'dirigeant'::text])) AND (tm_player.user_id = mesures.user_id))))))
  with check (((user_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM (team_members tm_coach
     JOIN team_members tm_player ON ((tm_player.team_id = tm_coach.team_id)))
  WHERE ((tm_coach.user_id = auth.uid()) AND (tm_coach.role = ANY (ARRAY['coach'::text, 'dirigeant'::text])) AND (tm_player.user_id = mesures.user_id))))));

create policy coach_read_team_mesures on public.mesures as PERMISSIVE for SELECT to public
  using ((EXISTS ( SELECT 1
   FROM (team_members tm_coach
     JOIN team_members tm_player ON ((tm_player.team_id = tm_coach.team_id)))
  WHERE ((tm_coach.user_id = auth.uid()) AND (tm_coach.role = ANY (ARRAY['coach'::text, 'dirigeant'::text])) AND (tm_player.user_id = mesures.user_id)))));

-- profils
create policy "Accès profil personnel" on public.profils as PERMISSIVE for ALL to public
  using ((auth.uid() = user_id));

create policy "Admin voit tous les profils" on public.profils as PERMISSIVE for SELECT to public
  using ((EXISTS ( SELECT 1
   FROM admins
  WHERE (admins.user_id = auth.uid()))));

create policy admins_update_any_profil on public.profils as PERMISSIVE for UPDATE to public
  using ((EXISTS ( SELECT 1
   FROM admins a
  WHERE (a.user_id = auth.uid()))));

create policy teammates_read_profiles on public.profils as PERMISSIVE for SELECT to public
  using ((EXISTS ( SELECT 1
   FROM (team_members tm1
     JOIN team_members tm2 ON ((tm1.team_id = tm2.team_id)))
  WHERE ((tm1.user_id = auth.uid()) AND (tm2.user_id = profils.user_id)))));

-- seance_templates
create policy admin_manage_all_seance_templates on public.seance_templates as PERMISSIVE for ALL to public
  using ((EXISTS ( SELECT 1
   FROM admins
  WHERE (admins.user_id = auth.uid()))));

create policy coach_manage_own_seance_templates on public.seance_templates as PERMISSIVE for ALL to public
  using ((created_by = auth.uid()))
  with check ((created_by = auth.uid()));

-- seances
create policy "Accès séances personnelles" on public.seances as PERMISSIVE for ALL to public
  using ((auth.uid() = user_id));

create policy "Admin gere toutes les seances" on public.seances as PERMISSIVE for ALL to public
  using ((EXISTS ( SELECT 1
   FROM admins
  WHERE (admins.user_id = auth.uid()))))
  with check ((EXISTS ( SELECT 1
   FROM admins
  WHERE (admins.user_id = auth.uid()))));

create policy "Admin voit toutes les séances" on public.seances as PERMISSIVE for SELECT to public
  using ((EXISTS ( SELECT 1
   FROM admins
  WHERE (admins.user_id = auth.uid()))));

create policy coach_manage_team_seances on public.seances as PERMISSIVE for ALL to public
  using ((((user_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM team_members tm_coach
  WHERE ((tm_coach.user_id = auth.uid()) AND (tm_coach.role = ANY (ARRAY['coach'::text, 'dirigeant'::text])) AND (tm_coach.team_id = seances.team_id)))) AND (EXISTS ( SELECT 1
   FROM team_members tm_player
  WHERE ((tm_player.team_id = seances.team_id) AND (tm_player.user_id = seances.user_id))))) OR ((managed_player_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM (managed_players mp
     JOIN team_members tm ON ((tm.team_id = mp.team_id)))
  WHERE ((mp.id = seances.managed_player_id) AND (tm.user_id = auth.uid()) AND (tm.role = ANY (ARRAY['coach'::text, 'dirigeant'::text]))))))))
  with check ((((user_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM team_members tm_coach
  WHERE ((tm_coach.user_id = auth.uid()) AND (tm_coach.role = ANY (ARRAY['coach'::text, 'dirigeant'::text])) AND (tm_coach.team_id = seances.team_id)))) AND (EXISTS ( SELECT 1
   FROM team_members tm_player
  WHERE ((tm_player.team_id = seances.team_id) AND (tm_player.user_id = seances.user_id))))) OR ((managed_player_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM (managed_players mp
     JOIN team_members tm ON ((tm.team_id = mp.team_id)))
  WHERE ((mp.id = seances.managed_player_id) AND (tm.user_id = auth.uid()) AND (tm.role = ANY (ARRAY['coach'::text, 'dirigeant'::text]))))))));

-- team_daily_sessions
create policy admin_manage_team_daily_sessions on public.team_daily_sessions as PERMISSIVE for ALL to public
  using ((EXISTS ( SELECT 1
   FROM admins
  WHERE (admins.user_id = auth.uid()))));

create policy coach_manage_own_team_daily_sessions on public.team_daily_sessions as PERMISSIVE for ALL to public
  using ((EXISTS ( SELECT 1
   FROM team_members tm
  WHERE ((tm.user_id = auth.uid()) AND (tm.team_id = team_daily_sessions.team_id) AND (tm.role = ANY (ARRAY['coach'::text, 'dirigeant'::text]))))))
  with check ((EXISTS ( SELECT 1
   FROM team_members tm
  WHERE ((tm.user_id = auth.uid()) AND (tm.team_id = team_daily_sessions.team_id) AND (tm.role = ANY (ARRAY['coach'::text, 'dirigeant'::text]))))));

create policy teammates_read_team_daily_sessions on public.team_daily_sessions as PERMISSIVE for SELECT to public
  using ((EXISTS ( SELECT 1
   FROM team_members tm
  WHERE ((tm.user_id = auth.uid()) AND (tm.team_id = team_daily_sessions.team_id)))));

-- team_members
create policy admins_manage_team_members on public.team_members as PERMISSIVE for ALL to public
  using ((EXISTS ( SELECT 1
   FROM admins
  WHERE (admins.user_id = auth.uid()))));

create policy teammates_read_team_members on public.team_members as PERMISSIVE for SELECT to authenticated
  using (is_team_member(team_id));

create policy users_join_own_team on public.team_members as PERMISSIVE for INSERT to public
  with check ((user_id = auth.uid()));

create policy users_leave_own_team on public.team_members as PERMISSIVE for DELETE to public
  using ((user_id = auth.uid()));

-- team_messages
create policy own_or_admin_delete_messages on public.team_messages as PERMISSIVE for DELETE to public
  using (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM admins a
  WHERE (a.user_id = auth.uid())))));

create policy team_members_read_messages on public.team_messages as PERMISSIVE for SELECT to public
  using (((EXISTS ( SELECT 1
   FROM team_members tm
  WHERE ((tm.team_id = team_messages.team_id) AND (tm.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM admins a
  WHERE (a.user_id = auth.uid())))));

create policy team_members_send_messages on public.team_messages as PERMISSIVE for INSERT to public
  with check (((user_id = auth.uid()) AND ((EXISTS ( SELECT 1
   FROM team_members tm
  WHERE ((tm.team_id = team_messages.team_id) AND (tm.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM admins a
  WHERE (a.user_id = auth.uid()))))));

-- team_programs
create policy admins_manage_team_programs on public.team_programs as PERMISSIVE for ALL to public
  using ((EXISTS ( SELECT 1
   FROM admins
  WHERE (admins.user_id = auth.uid()))));

create policy coach_manage_own_team_programs on public.team_programs as PERMISSIVE for ALL to public
  using ((EXISTS ( SELECT 1
   FROM team_members tm
  WHERE ((tm.user_id = auth.uid()) AND (tm.team_id = team_programs.team_id) AND (tm.role = ANY (ARRAY['coach'::text, 'dirigeant'::text]))))))
  with check ((EXISTS ( SELECT 1
   FROM team_members tm
  WHERE ((tm.user_id = auth.uid()) AND (tm.team_id = team_programs.team_id) AND (tm.role = ANY (ARRAY['coach'::text, 'dirigeant'::text]))))));

create policy team_members_read_team_programs on public.team_programs as PERMISSIVE for SELECT to authenticated
  using ((is_team_member(team_id) OR (EXISTS ( SELECT 1
   FROM admins a
  WHERE (a.user_id = auth.uid())))));

-- teams
create policy admins_manage_teams on public.teams as PERMISSIVE for ALL to public
  using ((EXISTS ( SELECT 1
   FROM admins a
  WHERE (a.user_id = auth.uid()))));

create policy authenticated_read_teams on public.teams as PERMISSIVE for SELECT to public
  using ((auth.uid() IS NOT NULL));

create policy public_read_teams on public.teams as PERMISSIVE for SELECT to public
  using (true);


-- ---------------------------------------------------------------------
-- Stockage (photos de profil et d'équipe)
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public) values ('photos', 'photos', true)
  on conflict (id) do nothing;

create policy "Supprimer photo personnelle" on storage.objects as PERMISSIVE for DELETE to public
  using (((auth.uid())::text = (storage.foldername(name))[1]));

create policy "Upload photo personnelle" on storage.objects as PERMISSIVE for INSERT to public
  with check (((auth.uid())::text = (storage.foldername(name))[1]));

create policy "Voir photos" on storage.objects as PERMISSIVE for SELECT to public
  using ((bucket_id = 'photos'::text));

create policy admins_insert_team_photos on storage.objects as PERMISSIVE for INSERT to authenticated
  with check (((bucket_id = 'photos'::text) AND (name ~~ 'teams/%'::text) AND (EXISTS ( SELECT 1
   FROM admins
  WHERE (admins.user_id = auth.uid())))));

create policy admins_update_team_photos on storage.objects as PERMISSIVE for UPDATE to authenticated
  using (((bucket_id = 'photos'::text) AND (name ~~ 'teams/%'::text) AND (EXISTS ( SELECT 1
   FROM admins
  WHERE (admins.user_id = auth.uid())))));


-- ---------------------------------------------------------------------
-- Temps réel (chat d'équipe)
-- ---------------------------------------------------------------------

alter publication supabase_realtime add table public.team_messages;
