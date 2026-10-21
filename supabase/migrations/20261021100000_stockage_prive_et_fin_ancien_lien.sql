-- Étape 2 (à appliquer APRÈS le déploiement du site qui utilise les liens signés et les codes
-- d'équipe) : le stockage des photos devient privé, et l'ancien lien joueur (identifiant de
-- l'équipe dans l'adresse) cesse de fonctionner.

update storage.buckets set public = false where id = 'photos';

drop function if exists public.join_team_via_link(uuid);
drop function if exists public.get_team_invite_info(uuid);
