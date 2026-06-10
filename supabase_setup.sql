-- =============================================
-- TxT Tracker — Script SQL Supabase
-- Coller dans : Supabase > SQL Editor > New Query
-- =============================================

-- Table profils joueurs
CREATE TABLE profils (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
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

-- Table mesures KPI
CREATE TABLE mesures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  kpi_id TEXT NOT NULL,
  valeur NUMERIC NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table séances validées
CREATE TABLE seances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  jour TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  validee BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, jour, date)
);

-- Sécurité RLS (Row Level Security)
ALTER TABLE profils ENABLE ROW LEVEL SECURITY;
ALTER TABLE mesures ENABLE ROW LEVEL SECURITY;
ALTER TABLE seances ENABLE ROW LEVEL SECURITY;

-- Chaque joueur ne voit que ses propres données
CREATE POLICY "Accès profil personnel" ON profils FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Accès mesures personnelles" ON mesures FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Accès séances personnelles" ON seances FOR ALL USING (auth.uid() = user_id);

-- Storage pour les photos de profil
INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', true);
CREATE POLICY "Upload photo personnelle" ON storage.objects FOR INSERT WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Voir photos" ON storage.objects FOR SELECT USING (bucket_id = 'photos');
CREATE POLICY "Supprimer photo personnelle" ON storage.objects FOR DELETE USING (auth.uid()::text = (storage.foldername(name))[1]);
