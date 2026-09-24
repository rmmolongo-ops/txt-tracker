# Base de données Supabase

Le dossier `migrations/` est la **source de vérité** du schéma de la base
(projet Supabase `TxT_tracker`). Toute modification de la base passe par un
fichier ici, versionné sur GitHub avec le code qui l'utilise.

## Contenu

| Fichier | Rôle |
|---|---|
| `migrations/20260924120000_baseline.sql` | Photo complète du schéma de production au 24/09/2026 : tables, contraintes, fonctions, règles d'accès RLS, stockage `photos`, temps réel du chat. **Ne jamais le modifier.** |
| `migrations/AAAAMMJJHHMMSS_nom.sql` | Chaque évolution suivante, une par fichier, dans l'ordre chronologique. |

La baseline a été vérifiée en la rejouant sur une base PostgreSQL vide : elle
recrée exactement le schéma de production (13 tables, 44 règles d'accès,
49 contraintes, 5 fonctions).

## Modifier la base : la marche à suivre

1. **Écrire la migration** dans un nouveau fichier
   `migrations/AAAAMMJJHHMMSS_description.sql` (date et heure UTC, nom en snake_case).
   Elle ne doit contenir que le changement, par exemple `alter table … add column …`.
2. **Préférer les changements compatibles** avec la version en ligne de l'appli :
   ajouter une colonne optionnelle ou avec valeur par défaut plutôt que renommer
   ou supprimer. Une suppression se fait en deux temps : d'abord le code n'utilise
   plus la colonne, ensuite une migration la supprime.
3. **La tester** sur la base de test (voir plus bas) avant la production.
4. **L'appliquer en production** : Supabase → SQL Editor, ou via l'outil
   `apply_migration` de Claude, avec **le même nom** que le fichier.
5. **Committer le fichier dans la même pull request** que le code qui s'en sert.

Chaque règle d'accès (policy RLS) doit être pensée pour trois profils : un visiteur
non connecté (`anon`), un joueur, et un coach ou admin.

## Base de test (à mettre en place)

Aujourd'hui il n'existe qu'une seule base, celle de production. Deux options :

- **Branches Supabase** (plan Pro) : une copie de la base par pull request, créée
  automatiquement à partir de ce dossier `migrations/`.
- **Second projet Supabase gratuit** « TxT_tracker_test » : y rejouer les fichiers
  de `migrations/` dans l'ordre, puis brancher les aperçus Vercel (Preview) dessus
  avec les variables d'environnement `REACT_APP_SUPABASE_URL` et
  `REACT_APP_SUPABASE_ANON_KEY` (voir `src/lib/supabase.js`).

## À régler dans le dashboard Supabase (manuel)

- **Authentication → Providers → Email → Leaked password protection** : à activer.
  Refuse les mots de passe connus dans des fuites (HaveIBeenPwned). La fonction
  demande le plan Pro.
- **Sauvegardes** : le plan gratuit ne fournit pas de sauvegarde restaurable.
  Passer au plan Pro (sauvegardes quotidiennes, 7 jours) ou exporter la base
  régulièrement (Database → Backups, ou `pg_dump`).
