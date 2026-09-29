-- 1. Auto-inscription : un utilisateur ne peut rejoindre une équipe que comme « joueur ».
--    Avant, l'API acceptait role = 'coach' / 'dirigeant' sur n'importe quelle équipe (les
--    identifiants d'équipes sont publics), ce qui donnait accès aux mesures, profils et chat.
--    Les rôles encadrants sont attribués par un admin (policies admins_manage_team_members
--    et club_managers_manage_team_members, inchangées).
alter policy users_join_own_team on public.team_members
  with check (user_id = (select auth.uid()) and role = 'joueur');

-- 2. Photos : la lecture publique des URL d'objets n'a pas besoin de policy SELECT (bucket
--    public), mais la policy « Voir photos » permettait aussi à un visiteur non connecté de
--    LISTER le bucket et d'y découvrir les identifiants de tous les utilisateurs.
--    On la remplace par un accès limité à son propre dossier (nécessaire aux upserts) et,
--    pour les admins, aux photos d'équipe.
drop policy if exists "Voir photos" on storage.objects;

create policy "Voir ses photos" on storage.objects as PERMISSIVE for SELECT to authenticated
  using (
    bucket_id = 'photos'
    and (
      (select auth.uid())::text = (storage.foldername(name))[1]
      or (name like 'teams/%' and exists (select 1 from public.admins a where a.user_id = (select auth.uid())))
    )
  );

-- 3. Remplacer sa photo de profil (upload avec upsert) exigeait aussi une policy UPDATE :
--    seule celle des photos d'équipe (admins) existait, si bien qu'un joueur ne pouvait
--    envoyer sa photo qu'une fois ; le remplacement échouait sans message d'erreur.
create policy "Modifier sa photo" on storage.objects as PERMISSIVE for UPDATE to authenticated
  using (bucket_id = 'photos' and (select auth.uid())::text = (storage.foldername(name))[1])
  with check (bucket_id = 'photos' and (select auth.uid())::text = (storage.foldername(name))[1]);
