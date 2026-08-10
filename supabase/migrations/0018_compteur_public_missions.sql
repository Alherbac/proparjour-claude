-- ProParJour — Migration 0018
-- La page d'accueil affiche un vrai nombre de missions gérées sur la
-- plateforme (voir décision du 2026-08-07 : ne plus afficher de
-- chiffres inventés). `missions` n'a aucune policy de lecture
-- publique (normal, ce sont des données semi-privées entre un
-- recruteur et ses prestataires) — un visiteur anonyme voit donc 0
-- ligne même s'il en existe réellement.
--
-- Cette fonction expose UNIQUEMENT le total (aucune colonne, aucune
-- ligne individuelle) via SECURITY DEFINER, sur le même principe que
-- la vue prestataires_publics : un agrégat public sans exposer les
-- données privées sous-jacentes.
--
-- À exécuter dans l'éditeur SQL du dashboard Supabase, après 0017.

create or replace function public.compter_missions_total()
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::integer from public.missions;
$$;

grant execute on function public.compter_missions_total() to anon, authenticated;
