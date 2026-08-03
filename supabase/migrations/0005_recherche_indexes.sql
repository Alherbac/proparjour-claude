-- ProParJour — Migration 0005
-- Étape 4 (recherche) : index manquants pour les filtres tarif et
-- disponibilité, en plus de metier/ville/statut_verification (0001)
-- et specialites (0002), déjà en place.
--
-- À exécuter dans l'éditeur SQL du dashboard Supabase, après 0004.

create index prestataires_profils_tarif_montant_idx
  on public.prestataires_profils (tarif_montant);

create index prestataires_profils_disponibilites_idx
  on public.prestataires_profils using gin (disponibilites);
