-- ProParJour — Migration 0020
-- Calendrier de disponibilités : en complément des jours de semaine
-- récurrents (`prestataires_profils.disponibilites`), un prestataire
-- peut marquer des dates précises comme disponibles (avec horaires)
-- ou indisponibles — une exception par date, qui prime sur le
-- schéma hebdomadaire côté affichage.
--
-- À exécuter dans l'éditeur SQL du dashboard Supabase, après 0019.

create table if not exists prestataires_disponibilites_exceptions (
  id uuid primary key default gen_random_uuid(),
  prestataire_id uuid not null references prestataires_profils (id) on delete cascade,
  date date not null,
  disponible boolean not null,
  heure_debut time,
  heure_fin time,
  created_at timestamptz not null default now(),
  unique (prestataire_id, date)
);

alter table prestataires_disponibilites_exceptions enable row level security;

drop policy if exists "disponibilites_exceptions_select_own_ou_admin" on prestataires_disponibilites_exceptions;
create policy "disponibilites_exceptions_select_own_ou_admin"
  on prestataires_disponibilites_exceptions for select
  using (
    exists (
      select 1 from prestataires_profils pp
      where pp.id = prestataire_id and (pp.user_id = auth.uid() or is_admin())
    )
  );

drop policy if exists "disponibilites_exceptions_insert_own" on prestataires_disponibilites_exceptions;
create policy "disponibilites_exceptions_insert_own"
  on prestataires_disponibilites_exceptions for insert
  with check (
    exists (
      select 1 from prestataires_profils pp
      where pp.id = prestataire_id and pp.user_id = auth.uid()
    )
  );

drop policy if exists "disponibilites_exceptions_update_own" on prestataires_disponibilites_exceptions;
create policy "disponibilites_exceptions_update_own"
  on prestataires_disponibilites_exceptions for update
  using (
    exists (
      select 1 from prestataires_profils pp
      where pp.id = prestataire_id and pp.user_id = auth.uid()
    )
  );

drop policy if exists "disponibilites_exceptions_delete_own" on prestataires_disponibilites_exceptions;
create policy "disponibilites_exceptions_delete_own"
  on prestataires_disponibilites_exceptions for delete
  using (
    exists (
      select 1 from prestataires_profils pp
      where pp.id = prestataire_id and pp.user_id = auth.uid()
    )
  );

create index if not exists disponibilites_exceptions_prestataire_date_idx
  on prestataires_disponibilites_exceptions (prestataire_id, date);
