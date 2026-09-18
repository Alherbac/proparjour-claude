-- ProParJour — Migration 0061
-- Vue jumelle de `prestataires_publics` (0019), SANS l'exigence
-- `statut_verification = 'valide'` — demande produit (période de
-- test avant lancement, même principe que 0058 pour les
-- candidatures) : la vérification manuelle des profils par l'équipe
-- ProParJour n'est pas encore opérationnelle, donc exiger un profil
-- validé empêchait de trouver et proposer une mission à un
-- prestataire pourtant bien inscrit.
--
-- Volontairement une VUE SÉPARÉE plutôt qu'une modification de
-- `prestataires_publics` elle-même : celle-ci alimente aussi le
-- sitemap (indexation Google), les statistiques publiques, le
-- moteur de matching et les favoris — y laisser filtrer des profils
-- non validés dépasserait largement le besoin ("trouver et proposer
-- la mission aux inscrits"). Cette vue-ci n'est lue que par
-- `rechercherPrestataires` (lib/recherche.ts), et seulement quand
-- `SKIP_KYC_VALIDATION=true` (jamais en production).
--
-- Mêmes colonnes que prestataires_publics, aucune de plus : jamais
-- iban/bic/numero_carte_cnaps, même principe de sécurité (0032).
--
-- Pour retirer cette vue une fois la vérification des profils
-- opérationnelle : `drop view public.prestataires_publics_test_sans_validation;`
-- et retirer la variable d'environnement SKIP_KYC_VALIDATION.
create or replace view public.prestataires_publics_test_sans_validation as
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
  pp.competences,
  pp.titre
from public.prestataires_profils pp
join public.users u on u.id = pp.user_id
where pp.visible = true;

grant select on public.prestataires_publics_test_sans_validation to anon, authenticated;
