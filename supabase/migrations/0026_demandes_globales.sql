-- Décomposition intelligente d'une demande client en plusieurs
-- sous-besoins métier indépendants (ex. "2 agents de sécurité, une
-- hôtesse et un vendeur" pour un même événement).
--
-- `demandes` est la vue globale conservée côté client ; chaque
-- sous-besoin devient une ligne atomique dans `offres` (1 offre = 1
-- recrutement, cohérent avec repondreCandidature qui marque déjà
-- toute une offre "pourvue" dès une acceptation — 2 postes du même
-- métier sont donc 2 lignes `offres` distinctes, pas une seule ligne
-- avec une colonne quantité).
--
-- Aucune modification de missions/mission_lignes/paiements : chaque
-- sous-besoin obtient son indépendance financière via le chemin
-- panier existant (acceptation de candidature -> ajouterLigne ->
-- finaliserCommande, qui groupe par date+adresse+description ; il
-- suffit que chaque offre porte une description distincte pour que
-- chaque prestation reste sur sa propre mission/paiement, cf.
-- publierDemandeGlobale dans actions/offres.ts).

create table if not exists public.demandes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.users (id) on delete cascade,
  titre text not null,
  texte_original text,
  created_at timestamptz not null default now()
);

alter table public.offres add column if not exists demande_id uuid references public.demandes (id) on delete set null;

create index if not exists offres_demande_id_idx on public.offres (demande_id);

alter table public.demandes enable row level security;

drop policy if exists demandes_select_own on public.demandes;
create policy demandes_select_own on public.demandes for select
  using (client_id = auth.uid() or public.is_admin());

drop policy if exists demandes_insert_own on public.demandes;
create policy demandes_insert_own on public.demandes for insert
  with check (client_id = auth.uid());
