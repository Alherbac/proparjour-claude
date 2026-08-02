-- ProParJour — schéma initial (Étape 1 du cahier des charges)
-- Tables : users, entreprises, prestataires_profils
-- À exécuter dans l'éditeur SQL du dashboard Supabase (projet région UE).
--
-- Ordre des blocs important : une fonction LANGUAGE SQL (is_admin) est
-- validée contre le catalogue dès sa création (contrairement à
-- plpgsql, où le corps n'est vérifié qu'à la première exécution), donc
-- toute table qu'elle référence doit déjà exister. D'où l'ordre :
-- types -> fonction générique sans dépendance -> table users -> is_admin
-- -> reste des fonctions/policies qui dépendent de is_admin.

create extension if not exists pgcrypto;

-- ============================================================
-- Types énumérés
-- ============================================================

create type public.user_type as enum (
  'recruteur_entreprise',
  'recruteur_particulier',
  'prestataire',
  'admin'
);

create type public.metier_type as enum (
  'securite',
  'accueil',
  'vente'
);

create type public.statut_independant_type as enum (
  'auto_entrepreneur',
  'societe',
  'autre'
);

create type public.tarif_type as enum (
  'horaire',
  'journalier'
);

create type public.statut_verification_type as enum (
  'en_attente',
  'valide',
  'refuse'
);

-- ============================================================
-- Fonction générique, sans dépendance sur une table applicative
-- ============================================================

-- Maintient updated_at à jour sur chaque UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- Table users — profil applicatif, en 1:1 avec auth.users
-- ============================================================
-- Créée avant is_admin() : cette fonction (LANGUAGE SQL) référence
-- public.users et serait rejetée à la création si la table n'existait
-- pas encore.

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  type public.user_type,
  prenom text,
  nom text,
  telephone text,
  ville text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- ============================================================
-- Fonctions utilitaires dépendant de public.users
-- ============================================================

-- SECURITY DEFINER pour éviter la récursion RLS quand une policy
-- a besoin de vérifier si l'utilisateur courant est admin.
--
-- Compte aussi comme "admin" les requêtes effectuées avec la clé
-- service_role (auth.role() = 'service_role') : ce client n'a pas
-- d'auth.uid() (pas de session utilisateur), et sans cette clause il
-- serait bloqué par les triggers prevent_self_* ci-dessous alors même
-- que RLS le laisse déjà tout faire. BYPASSRLS s'applique aux policies
-- mais pas aux triggers, d'où la nécessité de le gérer explicitement.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    auth.role() = 'service_role'
    or exists (
      select 1 from public.users
      where id = auth.uid() and type = 'admin'
    );
$$;

-- Crée automatiquement une ligne public.users à chaque inscription
-- (email/mot de passe ou OAuth Google) pour ne jamais avoir de compte
-- auth.users orphelin. Le type reste NULL tant que l'onboarding
-- applicatif (tunnel prestataire / formulaire recruteur) ne l'a pas
-- complété.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ============================================================
-- RLS — table users
-- ============================================================

alter table public.users enable row level security;

create policy "users_select_own_or_admin"
  on public.users for select
  using (auth.uid() = id or public.is_admin());

-- L'utilisateur et l'admin peuvent tous deux modifier la ligne ; le
-- trigger ci-dessous empêche un non-admin de changer sa propre colonne
-- `type` (donc de s'auto-attribuer 'admin' ou tout autre rôle), même
-- si la policy elle-même l'autoriserait.
create policy "users_update_own_or_admin"
  on public.users for update
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

create or replace function public.prevent_self_type_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin()
     and new.type is distinct from old.type then
    raise exception 'Seul un administrateur peut modifier le type de compte.';
  end if;
  return new;
end;
$$;

create trigger users_guard_type
  before update on public.users
  for each row execute function public.prevent_self_type_change();

-- Pas de policy INSERT/DELETE : la ligne est créée uniquement par le
-- trigger handle_new_auth_user (security definer), jamais directement
-- par le client.

-- ============================================================
-- Table entreprises — 1:1 avec un user de type recruteur_entreprise
-- ============================================================

create table public.entreprises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users (id) on delete cascade,
  raison_sociale text not null,
  siret text not null check (siret ~ '^\d{14}$'),
  secteur_activite text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger entreprises_set_updated_at
  before update on public.entreprises
  for each row execute function public.set_updated_at();

alter table public.entreprises enable row level security;

create policy "entreprises_select_own_or_admin"
  on public.entreprises for select
  using (auth.uid() = user_id or public.is_admin());

create policy "entreprises_insert_own"
  on public.entreprises for insert
  with check (auth.uid() = user_id);

create policy "entreprises_update_own_or_admin"
  on public.entreprises for update
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

-- ============================================================
-- Table prestataires_profils — 1:1 avec un user de type prestataire
-- ============================================================

create table public.prestataires_profils (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users (id) on delete cascade,
  metier public.metier_type not null,
  statut_independant public.statut_independant_type not null,

  -- Spécialités conditionnelles selon le métier (voir cahier des
  -- charges section 4) ; toutes nullable, remplies selon `metier`.
  numero_carte_cnaps text,
  certifications text[] not null default '{}',
  langues text[] not null default '{}',
  tenue text,
  secteur_experience text,
  remuneration_commission boolean not null default false,

  bio text,
  ville text not null,
  tarif_type public.tarif_type not null,
  tarif_montant numeric(10, 2) not null check (tarif_montant > 0),
  disponibilites text[] not null default '{}',
  photo_url text,

  statut_verification public.statut_verification_type not null default 'en_attente',
  motif_refus text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger prestataires_profils_set_updated_at
  before update on public.prestataires_profils
  for each row execute function public.set_updated_at();

alter table public.prestataires_profils enable row level security;

-- Fiche publique : visible de tous (y compris anon) une fois validée
-- par l'admin — nécessaire pour /prestataires/[id] et la recherche.
create policy "prestataires_profils_select_public_valide"
  on public.prestataires_profils for select
  using (statut_verification = 'valide');

-- Le prestataire voit toujours son propre profil, même en attente
-- ou refusé (pour son tableau de bord).
create policy "prestataires_profils_select_own_or_admin"
  on public.prestataires_profils for select
  using (auth.uid() = user_id or public.is_admin());

create policy "prestataires_profils_insert_own"
  on public.prestataires_profils for insert
  with check (auth.uid() = user_id);

-- Le prestataire et l'admin peuvent tous deux modifier la ligne ;
-- le trigger ci-dessous empêche un non-admin de changer le statut
-- de vérification (voir prevent_self_verification_change).
create policy "prestataires_profils_update_own_or_admin"
  on public.prestataires_profils for update
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

create or replace function public.prevent_self_verification_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin()
     and new.statut_verification is distinct from old.statut_verification then
    raise exception 'Seul un administrateur peut modifier le statut de vérification.';
  end if;
  return new;
end;
$$;

create trigger prestataires_profils_guard_statut
  before update on public.prestataires_profils
  for each row execute function public.prevent_self_verification_change();

-- ============================================================
-- Index de recherche (métier, ville, disponibilité — Étape 4)
-- ============================================================

create index prestataires_profils_metier_idx on public.prestataires_profils (metier);
create index prestataires_profils_ville_idx on public.prestataires_profils (ville);
create index prestataires_profils_statut_verification_idx on public.prestataires_profils (statut_verification);
