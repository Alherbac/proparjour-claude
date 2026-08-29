-- ProParJour — Migration 0029
-- Coordonnées bancaires du prestataire (RIB, pour la libération de
-- paiement à venir — 0026/0118) : deux colonnes texte sur
-- prestataires_profils, jamais exposées par la vue prestataires_publics
-- (0003/0004), lisibles/modifiables uniquement par le propriétaire ou
-- un admin/modérateur (mêmes policies existantes "..._select_own_ou_..."
-- et "..._update_own_ou_..." de 0016 — colonnes ajoutées à une table déjà
-- couverte par ces policies, aucune nouvelle policy nécessaire).
--
-- À exécuter dans l'éditeur SQL du dashboard Supabase, après 0028.

alter table public.prestataires_profils
  add column iban text,
  add column bic text;
