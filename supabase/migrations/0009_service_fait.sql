-- ProParJour — Migration 0009
-- Étape 7A : cycle de vie de la mission (cahier des charges 3.9).
-- Chaque ligne de mission porte sa propre déclaration "service fait"
-- (un prestataire ne peut déclarer que la sienne) ; `missions.service_fait`
-- reste l'indicateur agrégé, mis à true par la confirmation du recruteur.
-- `motif_litige` capture la raison d'une contestation dès maintenant,
-- même si l'écran d'arbitrage admin (Étape 9) n'existe pas encore —
-- pour ne pas perdre l'information en attendant.
--
-- À exécuter dans l'éditeur SQL du dashboard Supabase, après 0008.

alter table public.mission_lignes
  add column service_fait boolean not null default false;

alter table public.missions
  add column motif_litige text;
