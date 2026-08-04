-- ProParJour — Migration 0014
-- Ajoute un interrupteur de visibilité globale : un prestataire peut
-- se rendre invisible des recherches recruteurs (ex. en congé), sans
-- toucher à son statut de vérification CNAPS. Par défaut visible,
-- pour ne pas faire disparaître les profils existants.
--
-- La vue prestataires_publics est mise à jour pour exclure les
-- profils désactivés (CREATE OR REPLACE suffit ici : la liste de
-- colonnes exposées ne change pas, seul le WHERE change).
--
-- À exécuter dans l'éditeur SQL du dashboard Supabase, après 0013.

alter table public.prestataires_profils
  add column visible boolean not null default true;

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
where pp.statut_verification = 'valide' and pp.visible = true;
