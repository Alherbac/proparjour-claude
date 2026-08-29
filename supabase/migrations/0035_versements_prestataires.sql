-- ProParJour — Migration 0035
-- Suivi des versements manuels aux prestataires (catégorie B, liste
-- du 2026-08-23, point 3). Le modèle de paiement actuel n'utilise
-- pas Stripe Connect : l'argent reste sur le compte Stripe unique de
-- la plateforme, et `paiements.statut = 'libere'` signifiait jusqu'ici
-- uniquement "le recruteur a confirmé le service fait", pas "l'argent
-- a réellement été viré au prestataire" — ces deux choses étaient
-- confondues, notamment dans tableau-de-bord/argent (le "Reçu" du
-- prestataire ne reflétait pas un vrai virement).
--
-- Une ligne dans cette table = un virement réellement effectué pour
-- une ligne de mission donnée (un prestataire, sur une mission). Son
-- absence pour une ligne dont le paiement est `libere` signifie que
-- le virement reste à faire — c'est exactement la liste que l'écran
-- admin "Versements" doit afficher.
create table if not exists public.versements_prestataires (
  mission_ligne_id uuid primary key references public.mission_lignes (id),
  reference text,
  verse_par uuid not null references public.users (id),
  verse_le timestamptz not null default now()
);
alter table public.versements_prestataires enable row level security;

-- Lecture par le prestataire concerné (pour que "Mon argent" affiche
-- son propre statut réel de virement) ou par un admin/modérateur.
-- Écriture réservée au rôle service (server action admin uniquement).
drop policy if exists "versements_select_prestataire_ou_admin" on public.versements_prestataires;
create policy "versements_select_prestataire_ou_admin"
  on public.versements_prestataires for select
  using (
    exists (
      select 1 from public.mission_lignes ml
      join public.prestataires_profils pp on pp.id = ml.prestataire_id
      where ml.id = versements_prestataires.mission_ligne_id and pp.user_id = auth.uid()
    )
    or public.has_role('admin')
    or public.has_role('moderator')
  );
