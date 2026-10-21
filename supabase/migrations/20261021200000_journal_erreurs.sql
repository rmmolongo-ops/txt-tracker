-- Journal des erreurs de l'appli : quand un écran plante chez un utilisateur, l'erreur est
-- enregistrée ici (sans service externe) et visible par le super admin dans l'espace Admin.
-- Écriture : un utilisateur connecté n'enregistre que ses propres erreurs, taille bornée.
-- Lecture : super admin uniquement. Aucune donnée saisie par l'utilisateur n'y est stockée.

create table public.client_errors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users(id) on delete cascade,
  message text not null check (char_length(message) <= 500),
  stack text check (char_length(stack) <= 4000),
  source text check (char_length(source) <= 40),
  url text check (char_length(url) <= 300),
  user_agent text check (char_length(user_agent) <= 300),
  created_at timestamptz not null default now()
);

create index client_errors_created_at_idx on public.client_errors (created_at desc);
create index client_errors_user_id_idx on public.client_errors (user_id);

alter table public.client_errors enable row level security;

create policy users_report_own_errors on public.client_errors as PERMISSIVE for INSERT to authenticated
  with check (user_id = (select auth.uid()));

create policy super_admin_read_errors on public.client_errors as PERMISSIVE for SELECT to authenticated
  using (exists (select 1 from public.admins where user_id = (select auth.uid())));

create policy super_admin_delete_errors on public.client_errors as PERMISSIVE for DELETE to authenticated
  using (exists (select 1 from public.admins where user_id = (select auth.uid())));
