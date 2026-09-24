-- Performance des règles d'accès (alerte « auth_rls_initplan » de Supabase).
--
-- Écrit tel quel, auth.uid() est réévalué pour CHAQUE ligne lue. Encapsulé en
-- (select auth.uid()), Postgres le calcule une seule fois par requête (InitPlan).
-- Le résultat des règles est strictement identique : seule la manière de l'évaluer change.
--
-- ALTER POLICY modifie l'expression en place (ni suppression ni recréation de règle,
-- donc aucun instant sans protection). Seules les occurrences non encore encapsulées
-- sont remplacées : relancer la migration ne change rien. Périmètre : schéma public
-- (les règles de storage.objects appartiennent au rôle interne de Supabase Storage).
do $$
declare
  p record;
  new_qual text;
  new_check text;
  stmt text;
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and coalesce(qual, '') || coalesce(with_check, '') ~ '(?<!SELECT )auth\.uid\(\)'
  loop
    new_qual := regexp_replace(p.qual, '(?<!SELECT )auth\.uid\(\)', '(select auth.uid())', 'g');
    new_check := regexp_replace(p.with_check, '(?<!SELECT )auth\.uid\(\)', '(select auth.uid())', 'g');
    stmt := format('alter policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
    if p.qual is not null then stmt := stmt || ' using (' || new_qual || ')'; end if;
    if p.with_check is not null then stmt := stmt || ' with check (' || new_check || ')'; end if;
    execute stmt;
  end loop;
end $$;
