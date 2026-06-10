# Guide de déploiement TxT Tracker
**État du projet : 11/06/2026 — version complète**

---

## Architecture du projet

```
txt-tracker/
├── public/
│   └── index.html
├── src/
│   ├── lib/
│   │   └── supabase.js        ← Client Supabase (URL + clé anon)
│   ├── components/
│   │   ├── Auth.js            ← Page login / inscription
│   │   └── App.js             ← Application complète (toutes les vues)
│   └── index.js               ← Racine React, gestion session
├── supabase_setup.sql         ← Script BDD à lancer dans Supabase
├── package.json
└── GUIDE_DEPLOIEMENT.md
```

**Dépendances** (package.json) :
- `react` + `react-dom` ^18.2.0
- `@supabase/supabase-js` ^2.39.0
- `recharts` ^2.10.0
- `react-scripts` 5.0.1

---

## Fonctionnalités en place

### Auth.js — Page d'authentification
- Onglets **Connexion** / **Inscription**
- Validation du mot de passe en temps réel (8 car. min, 1 majuscule, 1 chiffre, 1 spécial)
- Bouton afficher/masquer le mot de passe
- Bouton désactivé si conditions non remplies
- Messages d'erreur et de succès

### App.js — Application principale

**Header**
- Photo + nom cliquable → retour au dashboard depuis n'importe quel onglet

**Dashboard (Accueil)**
- Bloc assiduité 7 jours avec barre de progression
- Grille "Performances clés" : Sprint 30m, Jonglerie G, Précision, Scan (cliquables → stats)
- Section **"Mental du jour"** : saisie directe Motivation et Sommeil avec bouton ✓
- Programme du jour (expandable) avec bloc d'exercices et bouton de validation séance

**Séances**
- Programme de la semaine (LUN→DIM), chaque jour expandable
- Détail : objectif + blocs d'exercices + durée
- Bouton valider / dévalider la séance du jour

**Mesures (KPI)**
- Filtre par catégorie : Physique / Technique / Mental
- 9 KPIs : Sprint 30m, Sprint 10m, Jonglerie G/D, Précision, Slalom 20m, Scan, Motivation, Sommeil
- Saisie de valeur + enregistrement dans Supabase

**Stats**
- Sélecteur de KPI avec graphique (recharts LineChart)
- Progression en % par rapport à la première mesure
- Historique des 10 dernières mesures avec suppression (confirmation requise)

**Profil**
- Fiche : Nom, Prénom, Surnom, Club, Division, Poste 1, Poste 2
- Mode édition inline
- Upload photo (redimensionnée à 300px max, stockée dans Supabase Storage)

**Admin** *(visible uniquement si l'utilisateur est dans la table `admins`)*
- Compteur total de joueurs
- Carte par joueur : photo, nom/surnom, poste, club, division, nb séances, nb mesures
- Expandable : date dernière séance, date dernière mesure, grille de tous les KPIs (dernière valeur)

---

## ÉTAPE 1 — Configurer Supabase

### 1.1 — Créer le projet
1. Va sur https://supabase.com → **New project**
2. Note bien l'**URL** et la **clé anon** (Settings → API)

### 1.2 — Lancer le script SQL principal
1. Supabase → **SQL Editor** → **New Query**
2. Colle le contenu de `supabase_setup.sql` → **Run**

Ce script crée :
- Table `profils` (nom, prénom, surnom, club, division, postes, photo_url)
- Table `mesures` (kpi_id, valeur, date, user_id)
- Table `seances` (jour, date, user_id)
- RLS activé, chaque joueur ne voit que ses données
- Bucket Storage `photos` avec policies upload/lecture

### 1.3 — Créer la table admins + policies admin

Dans **SQL Editor** → **New Query**, colle et exécute :

```sql
-- Table admins
CREATE TABLE admins (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY
);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin voit son propre enregistrement" ON admins
  FOR SELECT USING (auth.uid() = user_id);

-- Policies lecture globale pour les admins
CREATE POLICY "Admin lit tous les profils" ON profils
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.user_id = auth.uid())
  );

CREATE POLICY "Admin lit toutes les mesures" ON mesures
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.user_id = auth.uid())
  );

CREATE POLICY "Admin lit toutes les séances" ON seances
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.user_id = auth.uid())
  );
```

### 1.4 — Te donner les droits admin

Crée d'abord ton compte via l'application (inscription normale), puis récupère ton `user_id` :

```sql
-- Dans SQL Editor :
SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 10;
```

Copie ton UUID, puis :

```sql
INSERT INTO admins (user_id) VALUES ('TON_UUID_ICI');
```

### 1.5 — Désactiver la confirmation email (optionnel pour les tests)

Supabase → **Authentication** → **Providers** → **Email** → désactive **"Confirm email"** → Save

---

## ÉTAPE 2 — Configurer le code

Dans `src/lib/supabase.js`, remplace par tes propres valeurs :

```js
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://TON_ID.supabase.co'
const SUPABASE_ANON_KEY = 'eyJ...'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
```

---

## ÉTAPE 3 — Pousser sur GitHub

Dans un terminal, depuis le dossier `txt-tracker` :

```bash
git init
git add .
git commit -m "TxT Tracker - version complète 11/06/2026"
git branch -M main
git remote add origin https://github.com/TON_USERNAME/txt-tracker.git
git push -u origin main
```

Si le repo existe déjà et que tu veux juste pousser les mises à jour :

```bash
git add .
git commit -m "description de la mise à jour"
git push
```

---

## ÉTAPE 4 — Déployer sur Vercel

1. Va sur https://vercel.com → **Add New Project**
2. Importe le repo GitHub `txt-tracker`
3. Laisse tous les paramètres par défaut (Vercel détecte Create React App)
4. Clique **Deploy**

URL générée : `https://txt-tracker-xxx.vercel.app`

Tout `git push` sur `main` redéploie automatiquement.

---

## ÉTAPE 5 — Ajouter un joueur

1. Envoie l'URL Vercel au joueur
2. Il crée son compte (email + mot de passe respectant les règles)
3. Son profil est créé automatiquement à la première connexion
4. Il apparaît dans ton onglet Admin dès sa première connexion

---

## Résumé des tables Supabase

| Table | Colonnes clés | RLS |
|-------|---------------|-----|
| `profils` | user_id, nom, prenom, surnom, club, division, poste1, poste2, photo_url | Joueur = ses données / Admin = tout |
| `mesures` | user_id, kpi_id, valeur, date | Joueur = ses données / Admin = tout |
| `seances` | user_id, jour, date | Joueur = ses données / Admin = tout |
| `admins` | user_id | Lecture de son propre enregistrement |

**KPI IDs utilisés dans le code :**
`sprint30`, `sprint10`, `jonglerie_g`, `jonglerie_d`, `precision`, `slalom`, `scan`, `motivation`, `sommeil`

---

## En cas de problème

**Le spinner tourne indéfiniment après connexion**
→ Vérifier que les tables `profils`, `mesures`, `seances` existent et que les RLS sont bien configurées.

**L'onglet Admin n'apparaît pas**
→ Vérifier que ton `user_id` est bien dans la table `admins` (voir étape 1.4).

**L'admin voit 0 mesures / séances pour les joueurs**
→ Les policies "Admin lit toutes les mesures/séances" ne sont pas créées. Relancer le SQL de l'étape 1.3.

**Erreur upload photo**
→ Vérifier que le bucket `photos` existe dans Supabase Storage et qu'il est public.
