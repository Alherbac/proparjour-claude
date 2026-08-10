-- ProParJour — Migration 0019
-- Titre professionnel libre (ex. "Agent de sécurité événementiel",
-- "Responsable coordination événementiel") affiché sur le badge à la
-- place du libellé générique du métier. Nullable ici : les profils
-- déjà en base (démo + migration Lovable, backfillée séparément
-- depuis `custom_title`) n'en ont pas tous un — l'affichage retombe
-- sur le libellé générique du métier tant que c'est le cas. Devient
-- obligatoire uniquement côté formulaire d'inscription (nouveau
-- prestataire), pas au niveau de la contrainte SQL.
--
-- À exécuter dans l'éditeur SQL du dashboard Supabase, après 0018.

alter table prestataires_profils add column if not exists titre text;

-- `titre` doit rester en dernière position : CREATE OR REPLACE VIEW
-- fait correspondre les colonnes par position (voir 0017).
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
  pp.competences,
  pp.titre
from public.prestataires_profils pp
join public.users u on u.id = pp.user_id
where pp.statut_verification = 'valide' and pp.visible = true;
