-- ProParJour — Migration 0059
-- Suivi d'exécution de mission : déclaration des heures réellement
-- effectuées, confirmation/contestation par le client, et montant
-- final recalculé au prorata quand la mission se termine plus tôt que
-- prévu (validation produit du 2026-09-17).
--
-- Deux couples de colonnes sur `mission_lignes` (une déclaration par
-- prestataire par mission, même granularité que `service_fait`,
-- 0009_service_fait.sql) :
--  - début RÉEL : déclaration précoce et optionnelle ("Mission
--    commencée"), purement informative, ne bloque jamais rien.
--  - fin RÉELLE : déclaration autoritaire ("Fin de la mission →
--    Éditer la facture"), c'est elle qui porte le montant final
--    recalculé (`tarif_final`) et dont la confirmation/contestation
--    conditionne la libération des fonds (voir le nouveau garde dans
--    confirmerServiceFait, actions/missions.ts).
--
-- `tarif_final` reste volontairement distinct de `tarif_applique` :
-- `tarif_applique` porte le montant convenu au devis (jamais écrasé
-- ici, conservé tel quel dans l'historique) ; `tarif_final` porte le
-- montant recalculé au temps réellement effectué, nul tant qu'aucune
-- fin n'a été déclarée — la source de vérité pour la facturation et
-- le paiement bascule sur `tarif_final` uniquement une fois posé.
alter table public.mission_lignes
  add column heure_debut_reelle time,
  add column heure_debut_declaree_le timestamptz,
  add column heure_debut_declaree_par uuid references public.users (id),
  add column heure_debut_statut text check (heure_debut_statut in ('declaree', 'confirmee', 'contestee')),
  add column motif_contestation_debut text,
  add column heure_fin_reelle time,
  add column heure_fin_declaree_le timestamptz,
  add column heure_fin_declaree_par uuid references public.users (id),
  add column heure_fin_statut text check (heure_fin_statut in ('declaree', 'confirmee', 'contestee')),
  add column motif_contestation_fin text,
  add column tarif_final numeric(10, 2) check (tarif_final is null or tarif_final > 0);

-- Nouveau type de message structuré (même mécanisme que 'devis',
-- 0031_candidature_vers_mission.sql) pour les cartes "Mission
-- commencée" / "Fin déclarée" / "Horaires confirmés ou contestés"
-- dans la messagerie — jamais un élément purement visuel, `metadata`
-- porte les valeurs réelles renvoyées par le serveur.
alter table public.messages drop constraint if exists messages_type_check;
alter table public.messages add constraint messages_type_check check (type in ('texte', 'systeme', 'devis', 'execution'));
