# 🚀 Guide de déploiement TxT Tracker

## ÉTAPE 1 — Configurer Supabase (5 min)

1. Va sur https://supabase.com → ton projet
2. Clique sur **SQL Editor** → **New Query**
3. Copie-colle le contenu du fichier `supabase_setup.sql`
4. Clique **Run** ✅

## ÉTAPE 2 — Activer la confirmation email (optionnel)

Pour les tests, désactive la confirmation email :
1. Supabase → **Authentication** → **Providers** → **Email**
2. Désactive **"Confirm email"** → Save

## ÉTAPE 3 — Mettre le code sur GitHub (3 min)

1. Va sur https://github.com → **New repository**
2. Nomme le repo `txt-tracker`
3. Laisse-le **Public** ou **Private**
4. Crée le repo

Ensuite dans un terminal sur ton PC :
```bash
cd txt-tracker
git init
git add .
git commit -m "TxT Tracker initial"
git branch -M main
git remote add origin https://github.com/TON_USERNAME/txt-tracker.git
git push -u origin main
```

## ÉTAPE 4 — Déployer sur Vercel (2 min)

1. Va sur https://vercel.com → **Add New Project**
2. Importe ton repo GitHub `txt-tracker`
3. Laisse tous les paramètres par défaut
4. Clique **Deploy** 🚀

Vercel va builder et déployer automatiquement.
Tu recevras une URL du type : `https://txt-tracker-xxx.vercel.app`

## ÉTAPE 5 — Partager avec Théo

Envoie lui l'URL Vercel.
Il crée son compte avec son email → il est connecté ! ✅

## ✅ Résumé des fichiers

```
txt-tracker/
├── public/
│   └── index.html
├── src/
│   ├── lib/
│   │   └── supabase.js       ← Config Supabase
│   ├── components/
│   │   ├── Auth.js           ← Page login/inscription
│   │   └── App.js            ← Application principale
│   └── index.js              ← Point d'entrée
├── package.json
└── supabase_setup.sql        ← Script à lancer dans Supabase
```

## 🔧 Mises à jour futures

À chaque modification du code, un simple `git push` sur GitHub
déclenchera automatiquement un redéploiement sur Vercel.
