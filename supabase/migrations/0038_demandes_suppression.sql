-- ProParJour — Migration 0038
-- Catégorie B, point 11 (Lot 2, module "Suppressions") : droit à
-- l'oubli RGPD. Jusqu'ici aucun mécanisme, ni côté utilisateur
-- (bouton "supprimer mon compte") ni côté admin (file d'attente) —
-- l'écran /admin/suppressions était un stub vide.
--
-- Un seul enum de statut, comme partout ailleurs dans ce projet
-- (mission_statut_type, paiement_statut_type...). Une demande "en
-- attente" par utilisateur au maximum (index unique partiel) — évite
-- l'accumulation de doublons si l'utilisateur reclique.
--
-- La suppression elle-même (auth.admin.deleteUser + cascade FK sur
-- toutes les tables métier, déjà `on delete cascade` partout) reste
-- une action manuelle de l'admin après revue — jamais automatique à
-- l'insertion de la demande, pour garder un point de contrôle humain
-- sur une opération irréversible.
--
-- À exécuter dans l'éditeur SQL du dashboard Supabase, après 0037.

create type public.suppression_statut_type as enum ('en_attente', 'traitee', 'refusee');

create table public.demandes_suppression_compte (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  motif text,
  statut public.suppression_statut_type not null default 'en_attente',
  traitee_par uuid references public.users (id),
  traitee_le timestamptz,
  motif_refus text,
  created_at timestamptz not null default now()
);

create unique index demandes_suppression_une_en_attente_par_user
  on public.demandes_suppression_compte (user_id)
  where statut = 'en_attente';

alter table public.demandes_suppression_compte enable row level security;

create policy "demandes_suppression_select_own_or_admin"
  on public.demandes_suppression_compte for select
  using (auth.uid() = user_id or public.has_role('admin') or public.has_role('moderator'));

create policy "demandes_suppression_insert_own"
  on public.demandes_suppression_compte for insert
  with check (auth.uid() = user_id);

-- Pas de policy UPDATE cliente : le traitement (statut → traitee/
-- refusee, suppression réelle du compte) passe par le client admin
-- dans une Server Action dédiée, jamais par le navigateur.

create index demandes_suppression_statut_idx on public.demandes_suppression_compte (statut);
