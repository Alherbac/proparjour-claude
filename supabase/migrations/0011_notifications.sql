-- ProParJour — Migration 0011
-- Étape 7C : notifications in-app (cahier des charges 3.8). Email/SMS
-- restent hors scope pour l'instant (clés Resend/Twilio à venir).
--
-- Écriture réservée au client admin (Server Actions déclenchées par
-- les événements du cycle de vie de la mission), sauf le marquage
-- "lu" que l'utilisateur peut faire lui-même sur ses propres lignes.
--
-- À exécuter dans l'éditeur SQL du dashboard Supabase, après 0010.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null,
  titre text not null,
  contenu text,
  lien text,
  lu boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "notifications_select_own_ou_admin"
  on public.notifications for select
  using (auth.uid() = user_id or public.is_admin());

create policy "notifications_update_own_ou_admin"
  on public.notifications for update
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

create index notifications_user_id_idx on public.notifications (user_id, lu, created_at desc);

alter publication supabase_realtime add table public.notifications;
