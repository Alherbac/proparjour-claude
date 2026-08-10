-- ProParJour — Migration 0023
-- Marché ouvert d'offres de mission : jusqu'ici un recruteur ne
-- pouvait recruter qu'en choisissant lui-même des prestataires
-- précis (panier → paiement, voir 0007). Cette migration ajoute une
-- deuxième voie : le recruteur publie une offre décrivant la
-- mission (sans prestataire nommé), visible par tous les
-- prestataires dont le métier correspond, qui peuvent y postuler.
--
-- Écriture des candidatures et des offres via le client session
-- (RLS) — pas besoin du client admin ici, contrairement à 0007 où la
-- création de mission implique une transaction paiement + lignes.

create type public.offre_statut_type as enum (
  'publiee',
  'pourvue',
  'annulee',
  'expiree'
);

create type public.candidature_statut_type as enum (
  'en_attente',
  'acceptee',
  'refusee'
);

create table public.offres (
  id uuid primary key default gen_random_uuid(),
  recruteur_id uuid not null references public.users (id) on delete cascade,
  titre text not null,
  description text not null,
  metier public.metier_type not null,
  ville text not null,
  date_mission date not null,
  heure_debut time not null,
  heure_fin time not null,
  tarif_horaire numeric(10, 2) not null check (tarif_horaire > 0),
  statut public.offre_statut_type not null default 'publiee',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (heure_fin <> heure_debut)
);

create trigger offres_set_updated_at
  before update on public.offres
  for each row execute function public.set_updated_at();

create table public.candidatures (
  id uuid primary key default gen_random_uuid(),
  offre_id uuid not null references public.offres (id) on delete cascade,
  prestataire_id uuid not null references public.prestataires_profils (id) on delete cascade,
  statut public.candidature_statut_type not null default 'en_attente',
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (offre_id, prestataire_id)
);

create trigger candidatures_set_updated_at
  before update on public.candidatures
  for each row execute function public.set_updated_at();

-- ============================================================
-- RLS — offres
-- ============================================================

alter table public.offres enable row level security;

-- Marché ouvert : toute offre "publiee" est visible par n'importe
-- quel utilisateur authentifié (les prestataires en particulier) ;
-- le recruteur voit toujours les siennes quel que soit leur statut.
create policy "offres_select_publiees_ou_proprietaire_ou_admin"
  on public.offres for select
  using (
    statut = 'publiee'
    or auth.uid() = recruteur_id
    or public.is_admin()
  );

create policy "offres_insert_recruteur"
  on public.offres for insert
  with check (auth.uid() = recruteur_id);

create policy "offres_update_proprietaire_ou_admin"
  on public.offres for update
  using (auth.uid() = recruteur_id or public.is_admin())
  with check (auth.uid() = recruteur_id or public.is_admin());

-- ============================================================
-- RLS — candidatures
-- ============================================================

alter table public.candidatures enable row level security;

create policy "candidatures_select_prestataire_ou_recruteur_ou_admin"
  on public.candidatures for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.prestataires_profils pp
      where pp.id = candidatures.prestataire_id and pp.user_id = auth.uid()
    )
    or exists (
      select 1 from public.offres o
      where o.id = candidatures.offre_id and o.recruteur_id = auth.uid()
    )
  );

create policy "candidatures_insert_prestataire"
  on public.candidatures for insert
  with check (
    exists (
      select 1 from public.prestataires_profils pp
      where pp.id = candidatures.prestataire_id and pp.user_id = auth.uid()
    )
  );

-- Seul le recruteur propriétaire de l'offre (ou l'admin) peut faire
-- évoluer le statut d'une candidature (accepter / refuser).
create policy "candidatures_update_recruteur_ou_admin"
  on public.candidatures for update
  using (
    public.is_admin()
    or exists (
      select 1 from public.offres o
      where o.id = candidatures.offre_id and o.recruteur_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.offres o
      where o.id = candidatures.offre_id and o.recruteur_id = auth.uid()
    )
  );

-- ============================================================
-- Index
-- ============================================================

create index offres_recruteur_id_idx on public.offres (recruteur_id);
create index offres_metier_idx on public.offres (metier);
create index offres_statut_idx on public.offres (statut);
create index candidatures_offre_id_idx on public.candidatures (offre_id);
create index candidatures_prestataire_id_idx on public.candidatures (prestataire_id);
