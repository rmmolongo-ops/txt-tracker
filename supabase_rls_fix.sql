-- =============================================
-- TxT Tracker — Correctif sécurité critique
-- RLS manquant sur teams / team_members / clubs /
-- team_programs / team_messages / chat_reads,
-- + garde-fou admin sur les fonctions RPC sensibles.
--
-- À exécuter dans Supabase > SQL Editor > New Query.
-- Idempotent : peut être relancé sans risque.
-- =============================================

-- -----------------------------------------------
-- Fonction utilitaire : l'utilisateur courant est-il admin ?
-- SECURITY DEFINER pour éviter toute récursion RLS.
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM admins WHERE admins.user_id = auth.uid());
$$;

-- -----------------------------------------------
-- TEAMS
-- -----------------------------------------------
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teams lecture publique" ON teams;
DROP POLICY IF EXISTS "Teams écriture admin" ON teams;
DROP POLICY IF EXISTS "Teams update admin" ON teams;
DROP POLICY IF EXISTS "Teams delete admin" ON teams;

-- Le nom des équipes doit rester visible même avant connexion (inscription, invitation)
CREATE POLICY "Teams lecture publique" ON teams
  FOR SELECT USING (true);

CREATE POLICY "Teams écriture admin" ON teams
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Teams update admin" ON teams
  FOR UPDATE USING (is_admin());

CREATE POLICY "Teams delete admin" ON teams
  FOR DELETE USING (is_admin());

-- -----------------------------------------------
-- CLUBS
-- -----------------------------------------------
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clubs lecture publique" ON clubs;
DROP POLICY IF EXISTS "Clubs écriture admin" ON clubs;
DROP POLICY IF EXISTS "Clubs update admin" ON clubs;
DROP POLICY IF EXISTS "Clubs delete admin" ON clubs;

CREATE POLICY "Clubs lecture publique" ON clubs
  FOR SELECT USING (true);

CREATE POLICY "Clubs écriture admin" ON clubs
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Clubs update admin" ON clubs
  FOR UPDATE USING (is_admin());

CREATE POLICY "Clubs delete admin" ON clubs
  FOR DELETE USING (is_admin());

-- -----------------------------------------------
-- TEAM_MEMBERS
-- -----------------------------------------------
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team_members lecture" ON team_members;
DROP POLICY IF EXISTS "Team_members insert soi-même" ON team_members;
DROP POLICY IF EXISTS "Team_members insert admin" ON team_members;
DROP POLICY IF EXISTS "Team_members update admin" ON team_members;
DROP POLICY IF EXISTS "Team_members delete" ON team_members;

-- Un joueur voit ses propres appartenances + celles de ses coéquipiers (roster) ; l'admin voit tout
CREATE POLICY "Team_members lecture" ON team_members
  FOR SELECT USING (
    auth.uid() = user_id
    OR is_admin()
    OR EXISTS (
      SELECT 1 FROM team_members me
      WHERE me.user_id = auth.uid() AND me.team_id = team_members.team_id
    )
  );

-- Un joueur peut rejoindre une équipe lui-même (invitation / auto-inscription)
CREATE POLICY "Team_members insert soi-même" ON team_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- L'admin peut ajouter n'importe qui à n'importe quelle équipe
CREATE POLICY "Team_members insert admin" ON team_members
  FOR INSERT WITH CHECK (is_admin());

-- Seul l'admin peut changer le rôle (joueur/coach/capitaine/dirigeant/invité)
CREATE POLICY "Team_members update admin" ON team_members
  FOR UPDATE USING (is_admin());

-- Un joueur peut quitter une équipe lui-même ; l'admin peut retirer qui il veut
CREATE POLICY "Team_members delete" ON team_members
  FOR DELETE USING (auth.uid() = user_id OR is_admin());

-- -----------------------------------------------
-- TEAM_PROGRAMS
-- -----------------------------------------------
ALTER TABLE team_programs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team_programs lecture membres" ON team_programs;
DROP POLICY IF EXISTS "Team_programs écriture admin" ON team_programs;
DROP POLICY IF EXISTS "Team_programs update admin" ON team_programs;
DROP POLICY IF EXISTS "Team_programs delete admin" ON team_programs;

-- Seuls les membres de l'équipe (ou l'admin) voient son programme
CREATE POLICY "Team_programs lecture membres" ON team_programs
  FOR SELECT USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_programs.team_id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team_programs écriture admin" ON team_programs
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Team_programs update admin" ON team_programs
  FOR UPDATE USING (is_admin());

CREATE POLICY "Team_programs delete admin" ON team_programs
  FOR DELETE USING (is_admin());

-- -----------------------------------------------
-- TEAM_MESSAGES (chat d'équipe)
-- -----------------------------------------------
ALTER TABLE team_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team_messages lecture membres" ON team_messages;
DROP POLICY IF EXISTS "Team_messages insert membres" ON team_messages;
DROP POLICY IF EXISTS "Team_messages delete" ON team_messages;

CREATE POLICY "Team_messages lecture membres" ON team_messages
  FOR SELECT USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_messages.team_id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team_messages insert membres" ON team_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_messages.team_id AND tm.user_id = auth.uid()
    )
  );

-- L'auteur peut supprimer son propre message ; l'admin peut modérer
CREATE POLICY "Team_messages delete" ON team_messages
  FOR DELETE USING (auth.uid() = user_id OR is_admin());

-- -----------------------------------------------
-- CHAT_READS
-- -----------------------------------------------
ALTER TABLE chat_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chat_reads accès personnel" ON chat_reads;

CREATE POLICY "Chat_reads accès personnel" ON chat_reads
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------
-- PROFILS — permettre aux coéquipiers de voir le roster
-- (nom/prénom/surnom/poste/photo), en plus de : soi-même + admin
-- -----------------------------------------------
DROP POLICY IF EXISTS "Coéquipiers lisent le roster" ON profils;

CREATE POLICY "Coéquipiers lisent le roster" ON profils
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members a
      JOIN team_members b ON a.team_id = b.team_id
      WHERE a.user_id = auth.uid() AND b.user_id = profils.user_id
    )
  );

-- -----------------------------------------------
-- SEANCES — permettre à l'admin/coach de valider/dévalider
-- une séance pour un AUTRE joueur (onglet "Suivi équipe")
-- -----------------------------------------------
DROP POLICY IF EXISTS "Admin gère les séances de l'équipe" ON seances;

CREATE POLICY "Admin gère les séances de l'équipe" ON seances
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- =============================================
-- FONCTIONS RPC SENSIBLES — garde-fou admin obligatoire
-- =============================================
-- Ces 3 fonctions existent déjà dans votre projet mais ne sont pas
-- versionnées dans ce repo : on ne peut pas garantir depuis le code
-- qu'elles vérifient bien que l'appelant est admin avant d'agir.
-- Si elles n'ont pas cette vérification, N'IMPORTE QUEL utilisateur
-- connecté peut aujourd'hui :
--   - lire l'email de tous les utilisateurs (get_user_emails_for_admins)
--   - lister les inscriptions non confirmées (get_unconfirmed_signups_for_admins)
--   - supprimer N'IMPORTE QUEL compte (delete_user_as_admin)
-- en appelant directement supabase.rpc(...) depuis la console du navigateur.
--
-- Étape 1 : vérifiez leur définition actuelle dans
--   Supabase > Database > Functions
-- Étape 2 : si le garde-fou "IF NOT is_admin() THEN RAISE EXCEPTION"
--   est absent, remplacez-les par les versions ci-dessous
--   (adaptez le corps si votre implémentation diffère).

CREATE OR REPLACE FUNCTION get_user_emails_for_admins()
RETURNS TABLE(user_id UUID, email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : réservé aux administrateurs';
  END IF;
  RETURN QUERY SELECT au.id, au.email::TEXT FROM auth.users au;
END;
$$;

CREATE OR REPLACE FUNCTION get_unconfirmed_signups_for_admins()
RETURNS TABLE(user_id UUID, email TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : réservé aux administrateurs';
  END IF;
  RETURN QUERY
    SELECT au.id, au.email::TEXT, au.created_at
    FROM auth.users au
    WHERE au.email_confirmed_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION delete_user_as_admin(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : réservé aux administrateurs';
  END IF;
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Un administrateur ne peut pas supprimer son propre compte via cette fonction';
  END IF;
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

-- Ces fonctions ne doivent être exécutables que par un utilisateur connecté
REVOKE ALL ON FUNCTION get_user_emails_for_admins() FROM anon, public;
REVOKE ALL ON FUNCTION get_unconfirmed_signups_for_admins() FROM anon, public;
REVOKE ALL ON FUNCTION delete_user_as_admin(UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION get_user_emails_for_admins() TO authenticated;
GRANT EXECUTE ON FUNCTION get_unconfirmed_signups_for_admins() TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_as_admin(UUID) TO authenticated;

-- =============================================
-- FIN DU CORRECTIF
-- =============================================
