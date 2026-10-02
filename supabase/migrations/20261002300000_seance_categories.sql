-- Catégories personnelles de la bibliothèque de séances : chaque coach crée les siennes
-- (ex. « Technique », « Physique ») et y classe ses modèles. Strictement privées, comme
-- seance_templates : visibles par leur créateur et par le super admin.

create table public.seance_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 40),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index seance_categories_owner_name_key on public.seance_categories (created_by, lower(btrim(name)));

alter table public.seance_categories enable row level security;

create policy coach_manage_own_seance_categories on public.seance_categories as PERMISSIVE for ALL to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

create policy admin_manage_all_seance_categories on public.seance_categories as PERMISSIVE for ALL to authenticated
  using (exists (select 1 from public.admins where user_id = (select auth.uid())));

-- Supprimer une catégorie ne supprime pas les séances : elles repassent « sans catégorie ».
alter table public.seance_templates
  add column category_id uuid references public.seance_categories(id) on delete set null;

create index seance_templates_category_id_idx on public.seance_templates (category_id);
