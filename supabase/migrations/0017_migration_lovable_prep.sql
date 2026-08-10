-- ProParJour — Migration 0017
-- Préparation de la migration des comptes du site en ligne (Lovable) :
-- ajoute les compétences (tableau simple, même pattern que
-- `certifications`/`langues`) et les formations (table dédiée, un
-- prestataire peut en avoir plusieurs), et un bucket public pour la
-- photo de profil — aucune de ces trois choses n'existait avant, le
-- tunnel d'inscription ne les collectait pas.
--
-- Écriture réservée au script de migration (service_role) et à
-- l'admin dans ce lot : pas d'écran "modifier mes formations" côté
-- prestataire pour l'instant, donc pas de policy INSERT/UPDATE client.
--
-- Idempotent : le SQL editor de Supabase exécute tout le script dans
-- une seule transaction implicite — une erreur en fin de script annule
-- tout ce qui précède. Chaque étape est donc protégée (IF NOT EXISTS /
-- DROP ... IF EXISTS) pour que ce fichier puisse être rejoué sans
-- risque après un échec partiel.
--
-- À exécuter dans l'éditeur SQL du dashboard Supabase, après 0016.

-- ============================================================
-- 1. Compétences — tableau simple sur prestataires_profils
-- ============================================================

alter table public.prestataires_profils
  add column if not exists competences text[] not null default '{}';

-- ============================================================
-- 2. Formations — une ligne par formation
-- ============================================================

create table if not exists public.prestataires_formations (
  id uuid primary key default gen_random_uuid(),
  prestataire_id uuid not null references public.prestataires_profils (id) on delete cascade,
  etablissement text not null,
  diplome text not null,
  annee_obtention integer,
  description text,
  created_at timestamptz not null default now()
);

alter table public.prestataires_formations enable row level security;

-- Même visibilité que prestataires_profils lui-même : le prestataire
-- voit toujours les siennes, l'admin/modérateur voit tout, le public
-- voit celles d'un profil validé.
drop policy if exists "prestataires_formations_select_own_admin_ou_public" on public.prestataires_formations;
create policy "prestataires_formations_select_own_admin_ou_public"
  on public.prestataires_formations for select
  using (
    exists (
      select 1 from public.prestataires_profils pp
      where pp.id = prestataires_formations.prestataire_id
        and (pp.user_id = auth.uid() or pp.statut_verification = 'valide')
    )
    or public.has_role('admin')
    or public.has_role('moderator')
  );

create index if not exists prestataires_formations_prestataire_id_idx
  on public.prestataires_formations (prestataire_id);

-- ============================================================
-- 3. Vue prestataires_publics — expose les compétences
-- ============================================================

-- `competences` doit rester en dernière position : CREATE OR REPLACE
-- VIEW fait correspondre les colonnes par position et refuse d'en
-- insérer une au milieu (erreur 42P16 sinon).
create or replace view public.prestataires_publics as
select
  pp.id,
  pp.metier,
  pp.certifications,
  pp.langues,
  pp.bio,
  pp.ville,
  pp.tarif_type,
  pp.tarif_montant,
  pp.disponibilites,
  pp.photo_url,
  pp.specialites,
  pp.statut_verification,
  (pp.numero_carte_cnaps is not null) as cnaps_verifie,
  u.prenom,
  u.nom,
  pp.created_at,
  pp.competences
from public.prestataires_profils pp
join public.users u on u.id = pp.user_id
where pp.statut_verification = 'valide' and pp.visible = true;

-- ============================================================
-- 4. Bucket Storage public — photo de profil
-- ============================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_storage_insert_own" on storage.objects;
create policy "avatars_storage_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_storage_update_own" on storage.objects;
create policy "avatars_storage_update_own"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Bucket public : lecture ouverte à tous, y compris anon.
drop policy if exists "avatars_storage_select_public" on storage.objects;
create policy "avatars_storage_select_public"
  on storage.objects for select
  using (bucket_id = 'avatars');
