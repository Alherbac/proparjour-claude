-- ProParJour — Migration 0007
-- Étape 5 : panier multi-prestataires et réservation.
-- Tables : missions, mission_lignes (le panier, une fois validé),
-- paiements (séquestre simple — pas de Stripe Connect pour l'instant :
-- l'argent collecté reste sur le compte Stripe de la plateforme,
-- marqué "sequestre" en base, jusqu'au versement au prestataire qui
-- sera construit avec le cycle "service fait" de l'Étape 7).
--
-- Toutes les mutations (création de mission, acceptation/refus de
-- ligne, changement de statut) passent par des Server Actions côté
-- client admin — aucune policy INSERT/UPDATE n'est ouverte aux
-- utilisateurs authentifiés sur ces tables, pour garder toute la
-- logique métier (cohérence panier/paiement) côté serveur.
--
-- Ordre des blocs important (même principe que 0001_init.sql) : la
-- policy de `missions` référence `mission_lignes` dans un EXISTS, donc
-- les 3 tables doivent toutes exister avant qu'aucune policy ne soit
-- créée. D'où l'ordre : types -> les 3 tables (sans policies) ->
-- RLS + policies (une fois tout le schéma en place) -> fonction -> index.
--
-- À exécuter dans l'éditeur SQL du dashboard Supabase, après 0006.

-- ============================================================
-- Types énumérés
-- ============================================================

create type public.mission_statut_type as enum (
  'en_attente',
  'confirmee',
  'en_cours',
  'terminee',
  'annulee',
  'litige'
);

create type public.ligne_statut_type as enum (
  'en_attente',
  'acceptee',
  'refusee'
);

create type public.paiement_statut_type as enum (
  'en_attente',
  'sequestre',
  'libere',
  'rembourse',
  'echec'
);

-- ============================================================
-- Table missions — une commande = un événement (date + lieu)
-- ============================================================

create table public.missions (
  id uuid primary key default gen_random_uuid(),
  recruteur_id uuid not null references public.users (id) on delete cascade,
  lieu text not null,
  date_mission date not null,
  statut public.mission_statut_type not null default 'en_attente',
  service_fait boolean not null default false,
  montant_total numeric(10, 2) not null check (montant_total > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger missions_set_updated_at
  before update on public.missions
  for each row execute function public.set_updated_at();

-- ============================================================
-- Table mission_lignes — le panier, table clé du multi-prestataires
-- ============================================================

create table public.mission_lignes (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions (id) on delete cascade,
  prestataire_id uuid not null references public.prestataires_profils (id) on delete cascade,
  metier public.metier_type not null,
  heure_debut time not null,
  heure_fin time not null,
  tarif_applique numeric(10, 2) not null check (tarif_applique > 0),
  statut_acceptation public.ligne_statut_type not null default 'en_attente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Pas de check heure_fin > heure_debut : une mission de nuit (ex.
  -- 18h-2h, l'exemple même du cahier des charges section 8) a une
  -- heure de fin "avant" l'heure de début sur l'horloge — la durée
  -- réelle est calculée côté application (voir montantLigne).
  check (heure_fin <> heure_debut)
);

create trigger mission_lignes_set_updated_at
  before update on public.mission_lignes
  for each row execute function public.set_updated_at();

-- ============================================================
-- Table paiements — séquestre simple (pas de Connect pour l'instant)
-- ============================================================

create table public.paiements (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null unique references public.missions (id) on delete cascade,
  montant numeric(10, 2) not null check (montant > 0),
  statut public.paiement_statut_type not null default 'en_attente',
  taux_commission numeric(5, 2) not null check (taux_commission >= 0 and taux_commission <= 100),
  montant_commission numeric(10, 2) not null check (montant_commission >= 0),
  stripe_payment_intent_id text,
  date_deblocage timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger paiements_set_updated_at
  before update on public.paiements
  for each row execute function public.set_updated_at();

-- ============================================================
-- RLS + policies — les 3 tables existent maintenant, les EXISTS
-- croisés entre missions/mission_lignes/prestataires_profils sont
-- tous valides.
-- ============================================================

alter table public.missions enable row level security;

create policy "missions_select_recruteur_prestataire_ou_admin"
  on public.missions for select
  using (
    auth.uid() = recruteur_id
    or public.is_admin()
    or exists (
      select 1
      from public.mission_lignes ml
      join public.prestataires_profils pp on pp.id = ml.prestataire_id
      where ml.mission_id = missions.id
        and pp.user_id = auth.uid()
    )
  );

alter table public.mission_lignes enable row level security;

create policy "mission_lignes_select_recruteur_prestataire_ou_admin"
  on public.mission_lignes for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.missions m
      where m.id = mission_lignes.mission_id and m.recruteur_id = auth.uid()
    )
    or exists (
      select 1 from public.prestataires_profils pp
      where pp.id = mission_lignes.prestataire_id and pp.user_id = auth.uid()
    )
  );

alter table public.paiements enable row level security;

-- Le détail du paiement (montant, commission) reste privé au
-- recruteur et à l'admin — le prestataire voit le statut de la
-- mission, pas le détail financier de la transaction.
create policy "paiements_select_recruteur_ou_admin"
  on public.paiements for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.missions m
      where m.id = paiements.mission_id and m.recruteur_id = auth.uid()
    )
  );

-- ============================================================
-- Fonction transactionnelle : valide un panier en une seule mission
-- ============================================================
-- Regroupe l'insertion de la mission, de ses lignes et du paiement
-- dans une seule transaction (tout ou rien) plutôt que 3 insertions
-- séparées depuis le code applicatif. N'est appelée que depuis le
-- client admin (service_role, qui bypasse la RLS) via la Server
-- Action de validation du panier — jamais directement par un client
-- authentifié, d'où le revoke ci-dessous.

create or replace function public.creer_mission_payee(
  p_recruteur_id uuid,
  p_lieu text,
  p_date_mission date,
  p_lignes jsonb,
  p_montant_total numeric,
  p_taux_commission numeric,
  p_montant_commission numeric,
  p_stripe_payment_intent_id text
)
returns uuid
language plpgsql
as $$
declare
  v_mission_id uuid;
  v_ligne jsonb;
begin
  insert into public.missions (recruteur_id, lieu, date_mission, montant_total)
  values (p_recruteur_id, p_lieu, p_date_mission, p_montant_total)
  returning id into v_mission_id;

  for v_ligne in select * from jsonb_array_elements(p_lignes)
  loop
    insert into public.mission_lignes (
      mission_id, prestataire_id, metier, heure_debut, heure_fin, tarif_applique
    )
    values (
      v_mission_id,
      (v_ligne ->> 'prestataire_id')::uuid,
      (v_ligne ->> 'metier')::public.metier_type,
      (v_ligne ->> 'heure_debut')::time,
      (v_ligne ->> 'heure_fin')::time,
      (v_ligne ->> 'tarif_applique')::numeric
    );
  end loop;

  insert into public.paiements (
    mission_id, montant, statut, taux_commission, montant_commission, stripe_payment_intent_id
  )
  values (
    v_mission_id, p_montant_total, 'sequestre', p_taux_commission, p_montant_commission, p_stripe_payment_intent_id
  );

  return v_mission_id;
end;
$$;

revoke execute on function public.creer_mission_payee from public, anon, authenticated;
grant execute on function public.creer_mission_payee to service_role;

-- ============================================================
-- Index
-- ============================================================

create index missions_recruteur_id_idx on public.missions (recruteur_id);
create index missions_statut_idx on public.missions (statut);
create index mission_lignes_mission_id_idx on public.mission_lignes (mission_id);
create index mission_lignes_prestataire_id_idx on public.mission_lignes (prestataire_id);
