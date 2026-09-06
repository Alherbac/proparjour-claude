-- ProParJour — Migration 0044
-- Écran admin "Villes" (§5.11 du prompt ESPACE-ADMIN) : jusqu'ici
-- purement dérivé (offre/demande par ville, lib/admin/pilotage.ts),
-- aucune table ne permettait d'activer/désactiver une ville pour les
-- pages d'atterrissage et le référencement — c'est cette table de
-- configuration qui manquait, la donnée d'offre/demande reste
-- calculée en direct (jamais dupliquée ici).
--
-- Île-de-France (75 à 95) traitée comme une seule zone (cahier des
-- charges) : `code_zone` porte soit un code postal précis, soit un
-- libellé de zone libre ("75-95").
--
-- À exécuter dans l'éditeur SQL du dashboard Supabase, après 0043.

create table public.villes_admin (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  code_zone text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references public.users (id)
);

create unique index villes_admin_nom_key on public.villes_admin (lower(nom));

alter table public.villes_admin enable row level security;

-- Lecture publique : une ville désactivée ne doit plus apparaître sur
-- les pages d'atterrissage publiques, qui doivent donc pouvoir lire
-- cette table (filtrée côté requête sur `active = true`).
create policy "villes_admin_select_public"
  on public.villes_admin for select
  using (true);

-- Écriture réservée à l'admin/modérateur, via le client service_role
-- (même principe que le reste du back-office).
