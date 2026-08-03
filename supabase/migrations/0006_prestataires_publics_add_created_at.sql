-- ProParJour — Migration 0006
-- Ajoute `created_at` à la vue prestataires_publics, nécessaire pour
-- trier les résultats de recherche (Étape 4) par ancienneté du profil.
-- CREATE OR REPLACE VIEW suffit ici : on ajoute une colonne en fin de
-- liste, on n'en retire ni n'en réordonne aucune.
--
-- À exécuter dans l'éditeur SQL du dashboard Supabase, après 0005.

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
  pp.created_at
from public.prestataires_profils pp
join public.users u on u.id = pp.user_id
where pp.statut_verification = 'valide';
