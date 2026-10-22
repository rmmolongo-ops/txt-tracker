-- Protection des mineurs et RGPD.
--
-- 1. Signalement d'un message du chat d'équipe. Le signalement garde une copie du message (texte,
--    auteur) : la décision reste possible même si le message disparaît, et les admins de club,
--    qui ne lisent pas le chat, voient ce qui est reproché. Visible par le staff de l'équipe
--    (coachs/dirigeants), les admins/dirigeants du club et le super admin ; pas par l'auteur du
--    signalement (il n'en a pas besoin) ni, surtout, par l'auteur du message.
--    Écritures uniquement par fonctions : pas d'insertion ni de modification directe.
-- 2. Demande de suppression de compte : l'utilisateur la dépose depuis son profil (ou l'annule),
--    le super admin la voit dans le back-office et supprime le compte.

-- ---------------------------------------------------------------------
-- 1. Signalements
-- ---------------------------------------------------------------------
create table public.message_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.team_messages(id) on delete set null,
  team_id uuid not null references public.teams(id) on delete cascade,
  reporter_id uuid references auth.users(id) on delete set null,
  message_author_id uuid references auth.users(id) on delete set null,
  author_name text not null default '',
  message_content text not null,
  message_created_at timestamptz,
  reason text not null default '' check (char_length(reason) <= 500),
  created_at timestamptz not null default now(),
  status text not null default 'ouvert' check (status in ('ouvert', 'traite')),
  resolution text check (resolution in ('message_supprime', 'conserve')),
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz
);

create index message_reports_team_status_idx on public.message_reports (team_id, status);
create index message_reports_message_id_idx on public.message_reports (message_id);
create index message_reports_reporter_id_idx on public.message_reports (reporter_id);
create index message_reports_author_id_idx on public.message_reports (message_author_id);
create index message_reports_resolved_by_idx on public.message_reports (resolved_by);
-- Un même membre ne signale pas deux fois le même message tant que le signalement est ouvert.
create unique index message_reports_open_unique on public.message_reports (message_id, reporter_id) where status = 'ouvert';

alter table public.message_reports enable row level security;

create policy read_message_reports on public.message_reports as PERMISSIVE for SELECT to authenticated
  using (public.can_manage_team(team_id));

create or replace function public.report_message(p_message_id uuid, p_reason text default '')
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  msg public.team_messages%rowtype;
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Connexion requise';
  end if;
  select * into msg from public.team_messages where id = p_message_id;
  if not found then
    raise exception 'Message introuvable';
  end if;
  if not exists (select 1 from public.team_members where team_id = msg.team_id and user_id = auth.uid()) then
    raise exception 'Accès refusé : réservé aux membres de l''équipe';
  end if;
  if msg.user_id = auth.uid() then
    raise exception 'Tu ne peux pas signaler ton propre message';
  end if;
  if exists (select 1 from public.message_reports where message_id = p_message_id and reporter_id = auth.uid() and status = 'ouvert') then
    raise exception 'Tu as déjà signalé ce message';
  end if;
  insert into public.message_reports (message_id, team_id, reporter_id, message_author_id, author_name, message_content, message_created_at, reason)
  values (msg.id, msg.team_id, auth.uid(), msg.user_id,
          trim(coalesce(msg.sender_prenom, '') || ' ' || coalesce(msg.sender_nom, '')),
          msg.content, msg.created_at, left(trim(coalesce(p_reason, '')), 500))
  returning id into new_id;
  return new_id;
end;
$function$;

-- Décision du staff : supprimer le message (tous les signalements ouverts sur ce message sont
-- alors traités) ou le conserver (seul ce signalement est clos).
create or replace function public.resolve_message_report(p_report_id uuid, p_delete_message boolean)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  rep public.message_reports%rowtype;
begin
  select * into rep from public.message_reports where id = p_report_id;
  if not found then
    raise exception 'Signalement introuvable';
  end if;
  if not public.can_manage_team(rep.team_id) then
    raise exception 'Accès refusé : réservé au staff de l''équipe';
  end if;
  if rep.status <> 'ouvert' then
    raise exception 'Ce signalement a déjà été traité';
  end if;
  if p_delete_message then
    update public.message_reports
      set status = 'traite', resolution = 'message_supprime', resolved_by = auth.uid(), resolved_at = now()
      where status = 'ouvert' and (id = rep.id or (rep.message_id is not null and message_id = rep.message_id));
    if rep.message_id is not null then
      delete from public.team_messages where id = rep.message_id;
    end if;
  else
    update public.message_reports
      set status = 'traite', resolution = 'conserve', resolved_by = auth.uid(), resolved_at = now()
      where id = rep.id;
  end if;
end;
$function$;

revoke execute on function public.report_message(uuid, text) from public, anon;
revoke execute on function public.resolve_message_report(uuid, boolean) from public, anon;
grant execute on function public.report_message(uuid, text) to authenticated;
grant execute on function public.resolve_message_report(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------
-- 2. Demandes de suppression de compte
-- ---------------------------------------------------------------------
create table public.account_deletion_requests (
  user_id uuid primary key references auth.users(id) on delete cascade,
  reason text not null default '' check (char_length(reason) <= 500),
  requested_at timestamptz not null default now()
);

alter table public.account_deletion_requests enable row level security;

create policy read_own_or_super_admin_deletion_requests on public.account_deletion_requests as PERMISSIVE for SELECT to authenticated
  using (user_id = (select auth.uid()) or public.is_super_admin());

create policy create_own_deletion_request on public.account_deletion_requests as PERMISSIVE for INSERT to authenticated
  with check (user_id = (select auth.uid()));

create policy cancel_own_deletion_request on public.account_deletion_requests as PERMISSIVE for DELETE to authenticated
  using (user_id = (select auth.uid()));
