-- ProParJour — Migration 0025
-- Journal d'audit des actions admin sensibles (cahier des charges
-- back-office §17) — introduit ici car le module Missions est le
-- premier à exposer des actions sensibles (changement de statut
-- forcé, déblocage de fonds, annulation, ouverture de litige).
-- Écriture réservée au service_role (toujours appelé depuis des
-- Server Actions admin, jamais directement par un client).

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.users (id),
  action text not null,
  cible_type text not null,
  cible_id uuid not null,
  motif text,
  details jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_audit_log enable row level security;

drop policy if exists "admin_audit_log_select_admin_ou_moderateur" on public.admin_audit_log;
create policy "admin_audit_log_select_admin_ou_moderateur"
  on public.admin_audit_log for select
  using (public.has_role('admin') or public.has_role('moderator'));

create index if not exists admin_audit_log_cible_idx on public.admin_audit_log (cible_type, cible_id);
create index if not exists admin_audit_log_created_at_idx on public.admin_audit_log (created_at desc);
