-- Durée de conservation du journal d'erreurs (RGPD : minimisation). Les rapports d'erreur
-- contiennent l'identifiant du compte, la page et le navigateur : au-delà de 90 jours, ils ne
-- servent plus à corriger un bug. Purge chaque nuit par pg_cron (planificateur de Postgres).

create extension if not exists pg_cron;

create or replace function public.purge_client_errors(p_days integer default 90)
 returns integer
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  deleted integer;
begin
  delete from public.client_errors where created_at < now() - make_interval(days => greatest(p_days, 1));
  get diagnostics deleted = row_count;
  return deleted;
end;
$function$;

-- Réservée au planificateur : aucun appel possible depuis l'appli.
revoke execute on function public.purge_client_errors(integer) from public, anon, authenticated;

-- Tous les jours à 3 h 15 (UTC). Re-planifier avec le même nom remplace la tâche existante.
select cron.schedule('purge-journal-erreurs', '15 3 * * *', $$select public.purge_client_errors(90)$$);
