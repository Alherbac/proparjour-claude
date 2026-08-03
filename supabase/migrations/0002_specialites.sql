-- ProParJour — Migration 0002
-- Ajoute les spécialités (mots-clés) sélectionnées par le prestataire
-- à l'inscription (voir src/config/specialtyCategories.ts, source de
-- vérité de la taxonomie). Utilisées pour l'affichage en badges sur
-- la fiche publique et, à terme, pour la recherche par mot-clé
-- (Étape 4) — d'où l'index GIN dès maintenant.
--
-- À exécuter dans l'éditeur SQL du dashboard Supabase, après 0001_init.sql.

alter table public.prestataires_profils
  add column specialites text[] not null default '{}';

alter table public.prestataires_profils
  add constraint prestataires_profils_specialites_max6
  check (cardinality(specialites) <= 6);

create index prestataires_profils_specialites_idx
  on public.prestataires_profils using gin (specialites);
