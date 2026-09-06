-- ProParJour — Migration 0045
-- Écran admin "Commissions" (§5.7 du prompt ESPACE-ADMIN) : hiérarchie
-- de taux à trois niveaux (individuel > groupe > référence), des deux
-- côtés — jusqu'ici un seul taux global existait (parametres_commission,
-- 0039), qui reste ici le niveau "référence".
--
-- CÔTÉ PRESTATAIRES : la commission est déjà prélevée sur le montant
-- versé (paiements.montant_commission, calculé à la création de la
-- mission) — ces deux tables permettent de configurer le taux
-- applicable, mais NE MODIFIENT PAS rétroactivement les missions déjà
-- créées (même principe que parametres_commission).
--
-- CÔTÉ CLIENTS : "frais client" est un concept NEUF — aujourd'hui le
-- client paie exactement missions.montant_total, sans frais de
-- service additionnel nulle part dans le code de règlement
-- (src/app/actions/paiement-mission.ts, panier). Ces deux tables
-- stockent une configuration réelle et persistée, mais ne sont PAS
-- câblées dans le calcul du montant facturé au client tant qu'une
-- décision produit n'est pas prise sur ce point — voir le rapport de
-- livraison. Aucune donnée de test n'est insérée : les taux restent
-- à 0 (repli sur la référence) jusqu'à configuration explicite.
--
-- À exécuter dans l'éditeur SQL du dashboard Supabase, après 0044.

create table public.taux_commission_metier (
  metier public.metier_type primary key,
  taux numeric(5, 2) not null check (taux >= 0 and taux <= 40),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users (id)
);

create table public.taux_commission_prestataire (
  prestataire_id uuid primary key references public.prestataires_profils (id) on delete cascade,
  taux numeric(5, 2) not null check (taux >= 0 and taux <= 40),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users (id)
);

create table public.taux_frais_segment_client (
  segment text primary key check (segment in ('grands_comptes', 'entreprises_regulieres', 'entreprises_ponctuelles', 'clients_particuliers')),
  taux numeric(5, 2) not null check (taux >= 0 and taux <= 40),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users (id)
);

create table public.taux_frais_client (
  recruteur_id uuid primary key references public.users (id) on delete cascade,
  taux numeric(5, 2) not null check (taux >= 0 and taux <= 40),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users (id)
);

alter table public.taux_commission_metier enable row level security;
alter table public.taux_commission_prestataire enable row level security;
alter table public.taux_frais_segment_client enable row level security;
alter table public.taux_frais_client enable row level security;

create policy "taux_commission_metier_select_admin" on public.taux_commission_metier for select using (public.has_role('admin') or public.has_role('moderator'));
create policy "taux_commission_prestataire_select_admin" on public.taux_commission_prestataire for select using (public.has_role('admin') or public.has_role('moderator'));
create policy "taux_frais_segment_client_select_admin" on public.taux_frais_segment_client for select using (public.has_role('admin') or public.has_role('moderator'));
create policy "taux_frais_client_select_admin" on public.taux_frais_client for select using (public.has_role('admin') or public.has_role('moderator'));

-- Pas de policy INSERT/UPDATE cliente : écriture réservée aux Server
-- Actions admin via le client service_role, même principe que
-- parametres_commission (0039).
