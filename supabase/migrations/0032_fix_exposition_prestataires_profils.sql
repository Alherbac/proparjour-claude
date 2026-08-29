-- ProParJour — Migration 0032 (Bloc 10, audit sécurité)
-- CORRECTIF CRITIQUE : la policy "prestataires_profils_select_public_valide"
-- (0001_init.sql) expose TOUTE la ligne de prestataires_profils — y
-- compris iban, bic et numero_carte_cnaps — à n'importe quel visiteur
-- anonyme dès qu'un profil est validé. RLS filtre des LIGNES, jamais
-- des COLONNES : la vue prestataires_publics (0003/0004) choisit déjà
-- les bonnes colonnes pour l'affichage public, mais cette policy sur
-- la table brute reste directement interrogeable via l'API REST
-- (`/rest/v1/prestataires_profils?...`) et contourne entièrement le
-- filtrage de la vue. Confirmé en direct : une requête anonyme avec
-- la seule clé anon retournait iban/bic/numero_carte_cnaps.
--
-- Vérifié avant correction qu'aucun code applicatif ne dépend de
-- cette policy pour un usage légitime :
--   - la fiche publique (/prestataires/[id]) et le matching lisent
--     déjà prestataires_publics, jamais la table brute, pour du
--     cross-user ;
--   - les quelques lectures cross-user restantes sur la table brute
--     passent toutes par createAdminClient() (service_role, qui
--     bypass RLS de toute façon — cette policy ne leur sert à rien) ;
--   - la seule lecture cross-user via le client utilisateur normal
--     était un COUNT (page d'accueil, lib/plateforme-stats.ts) —
--     remplacé ci-dessous par une fonction SECURITY DEFINER n'exposant
--     que le total, sur le même principe que compter_missions_total()
--     (0018_compteur_public_missions.sql).
--
-- À exécuter dans l'éditeur SQL du dashboard Supabase, après 0031.

drop policy "prestataires_profils_select_public_valide" on public.prestataires_profils;

create or replace function public.compter_prestataires_valides()
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::integer
  from public.prestataires_profils
  where statut_verification = 'valide' and visible = true;
$$;

grant execute on function public.compter_prestataires_valides() to anon, authenticated;
