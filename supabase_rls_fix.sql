-- =============================================
-- TxT Tracker — Journal des correctifs sécurité
-- Appliqués directement en base le 2026-09-08 (projet Supabase
-- "TxT_tracker", iujwziigoedxpodecdld) via l'outil MCP Supabase.
-- Conservé ici à titre de documentation / traçabilité.
-- =============================================

-- Constat initial : contrairement à ce que laissait supposer
-- supabase_setup.sql (qui ne couvre que profils/mesures/seances/admins),
-- la base réelle avait déjà RLS activé et des policies correctes sur
-- teams, team_members, clubs, team_programs, team_messages, chat_reads,
-- et les 3 fonctions RPC (get_user_emails_for_admins,
-- get_unconfirmed_signups_for_admins, delete_user_as_admin) vérifiaient
-- déjà bien le statut admin en interne. Pas de correctif nécessaire
-- sur ces points.

-- -----------------------------------------------
-- 1) CRITIQUE — vue admin_dashboard exposée publiquement
-- -----------------------------------------------
-- La vue "admin_dashboard" (nom, prénom, surnom, club, division, poste,
-- photo_url + compteurs de séances/mesures de TOUS les joueurs) était
-- définie en SECURITY DEFINER ET accessible en SELECT par le rôle "anon"
-- (visiteur non authentifié). Elle contournait donc entièrement le RLS
-- de "profils" : n'importe qui sur Internet pouvait lire les données de
-- tous les joueurs (des mineurs) sans compte, via l'API REST Supabase.
-- Cette vue n'est utilisée nulle part dans le code de l'application.
--
-- Correctif appliqué :
ALTER VIEW public.admin_dashboard SET (security_invoker = on);
REVOKE ALL ON public.admin_dashboard FROM anon;
REVOKE ALL ON public.admin_dashboard FROM authenticated;
REVOKE ALL ON public.admin_dashboard FROM public;

-- -----------------------------------------------
-- 2) ÉLEVÉ — élévation de privilège via team_members
-- -----------------------------------------------
-- La policy "users_manage_own_memberships" (FOR ALL, user_id = auth.uid())
-- autorisait un joueur à modifier lui-même la colonne "role" de sa propre
-- ligne dans team_members (UPDATE), lui permettant de se déclarer
-- coach/capitaine/dirigeant sur n'importe quelle équipe dont il est
-- membre — alors que seul un admin doit pouvoir changer les rôles.
--
-- Correctif appliqué : on ne laisse au joueur que rejoindre (INSERT)
-- et quitter (DELETE) une équipe pour lui-même ; le changement de rôle
-- reste exclusivement admin (policy "admins_manage_team_members").
DROP POLICY IF EXISTS "users_manage_own_memberships" ON public.team_members;

CREATE POLICY "users_join_own_team" ON public.team_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_leave_own_team" ON public.team_members
  FOR DELETE USING (user_id = auth.uid());

-- -----------------------------------------------
-- 3) MOYEN — programmes d'entraînement lisibles hors équipe
-- -----------------------------------------------
-- La policy "authenticated_read_team_programs" laissait tout utilisateur
-- connecté lire les programmes de TOUTES les équipes, pas seulement
-- celles dont il est membre.
--
-- Correctif appliqué :
DROP POLICY IF EXISTS "authenticated_read_team_programs" ON public.team_programs;

CREATE POLICY "team_members_read_team_programs" ON public.team_programs
  FOR SELECT USING (
    is_team_member(team_id)
    OR EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid())
  );

-- -----------------------------------------------
-- 4) MINEUR — search_path mutable sur is_admin()
-- -----------------------------------------------
ALTER FUNCTION public.is_admin(uuid) SET search_path = public;

-- =============================================
-- RESTANT À FAIRE MANUELLEMENT (hors SQL)
-- =============================================
-- - Supabase > Authentication > Providers > Email :
--   activer "Leaked password protection" (vérification HaveIBeenPwned).
-- =============================================
