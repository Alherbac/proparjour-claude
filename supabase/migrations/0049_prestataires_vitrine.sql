-- ProParJour — Migration 0049
--
-- Vue `prestataires_vitrine` : sous-ensemble d'AFFICHAGE pour le
-- bandeau photo de la page d'accueil (composant PhotoBand — les
-- portraits qui défilent sous la barre de recherche).
--
-- Différence avec `prestataires_publics` (0003/0004/0032) : celle-ci
-- n'exige PAS que le profil soit validé (statut_verification =
-- 'valide'). La page d'accueil montre "la communauté ProParJour"
-- (visage + prénom + intitulé de poste), pas une liste de pros
-- vérifiés prêts à être embauchés — d'où l'inclusion des profils en
-- attente de validation. Le champ `statut_verification` est exposé
-- pour que le front puisse, s'il le souhaite, distinguer visuellement
-- les profils déjà validés.
--
-- Colonnes STRICTEMENT d'affichage — jamais aucune donnée sensible
-- (aucun iban / bic / numero_carte_cnaps / téléphone / e-mail), même
-- principe que prestataires_publics. Vue Postgres classique (pas
-- security_invoker) : elle s'exécute avec les droits du propriétaire,
-- donc lisible en anonyme sans rouvrir de policy sur la table brute
-- `prestataires_profils` (celle-ci reste fermée depuis 0032).
--
-- À exécuter dans l'éditeur SQL du dashboard Supabase, après 0048.

create or replace view public.prestataires_vitrine as
select
  pp.id,
  pp.metier,
  pp.titre,
  pp.ville,
  pp.photo_url,
  pp.statut_verification,
  pp.created_at,
  u.prenom
from public.prestataires_profils pp
join public.users u on u.id = pp.user_id
where pp.photo_url is not null;

grant select on public.prestataires_vitrine to anon, authenticated;
