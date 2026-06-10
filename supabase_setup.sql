-- =============================================
-- TxT Tracker — Script SQL Supabase complet
-- Coller dans : Supabase > SQL Editor > New Query
-- Dernière mise à jour : 11/06/2026
-- =============================================

-- -----------------------------------------------
-- TABLES
-- -----------------------------------------------

CREATE TABLE profils (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nom TEXT DEFAULT '',
  prenom TEXT DEFAULT '',
  surnom TEXT DEFAULT 'TxT',
  club TEXT DEFAULT '',
  division TEXT DEFAULT '',
  poste1 TEXT DEFAULT '',
  poste2 TEXT DEFAULT '',
  photo_url TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE mesures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  kpi_id TEXT NOT NULL,
  valeur NUMERIC NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE seances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  jour TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  validee BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, jour, date)
);

CREATE TABLE admins (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY
);

-- -----------------------------------------------
-- ROW LEVEL SECURITY
-- -----------------------------------------------

ALTER TABLE profils ENABLE ROW LEVEL SECURITY;
ALTER TABLE mesures ENABLE ROW LEVEL SECURITY;
ALTER TABLE seances ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Joueur : accès complet à ses propres données
CREATE POLICY "Joueur accès profil"   ON profils FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Joueur accès mesures"  ON mesures FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Joueur accès séances"  ON seances FOR ALL USING (auth.uid() = user_id);

-- Admin : lecture de toutes les données (en plus de ses propres via les policies ci-dessus)
CREATE POLICY "Admin lit tous les profils" ON profils
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM admins WHERE admins.user_id = auth.uid())
  );

CREATE POLICY "Admin lit toutes les mesures" ON mesures
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM admins WHERE admins.user_id = auth.uid())
  );

CREATE POLICY "Admin lit toutes les séances" ON seances
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM admins WHERE admins.user_id = auth.uid())
  );

-- Admin : lecture de la table admins (pour vérifier son propre statut)
CREATE POLICY "Admin voit son enregistrement" ON admins
  FOR SELECT USING (auth.uid() = user_id);

-- -----------------------------------------------
-- STORAGE — Photos de profil
-- -----------------------------------------------

INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', true);

CREATE POLICY "Upload photo personnelle" ON storage.objects
  FOR INSERT WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Voir photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'photos');

CREATE POLICY "Modifier photo personnelle" ON storage.objects
  FOR UPDATE USING (auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Supprimer photo personnelle" ON storage.objects
  FOR DELETE USING (auth.uid()::text = (storage.foldername(name))[1]);

-- -----------------------------------------------
-- AJOUTER UN ADMIN
-- Étape 1 : trouver ton UUID
--   SELECT id, email FROM auth.users ORDER BY created_at;
-- Étape 2 : insérer
--   INSERT INTO admins (user_id) VALUES ('TON_UUID');
-- -----------------------------------------------
