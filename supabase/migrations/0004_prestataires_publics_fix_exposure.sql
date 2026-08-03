-- ProParJour — Migration 0004
-- Corrige la vue prestataires_publics (0003) : `numero_carte_cnaps` était
-- inclus par erreur — un identifiant professionnel sensible n'a rien à
-- faire dans une vue lisible anonymement. Remplacé par un booléen
-- `cnaps_verifie` (le badge "CNAPS validé" de la fiche publique n'a
-- besoin que de savoir si le numéro existe, jamais de sa valeur).
-- `user_id` est aussi retiré (identifiant interne, non utilisé par la
-- fiche publique).
--
-- CREATE OR REPLACE VIEW ne permet pas de supprimer des colonnes
-- existantes en Postgres, d'où le DROP + CREATE.
--
-- À exécuter dans l'éditeur SQL du dashboard Supabase, après 0003.

drop view public.prestataires_publics;

create view public.prestataires_publics as
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
  u.nom
from public.prestataires_profils pp
join public.users u on u.id = pp.user_id
where pp.statut_verification = 'valide';

grant select on public.prestataires_publics to anon, authenticated;
