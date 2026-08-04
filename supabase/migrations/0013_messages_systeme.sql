-- ProParJour — Migration 0013
-- Distingue les messages système (générés automatiquement par le
-- cycle de vie de la mission : acceptation, refus, service fait,
-- confirmation, litige, annulation) des messages texte libres saisis
-- par un utilisateur, pour permettre un affichage différent côté
-- client (fusion messagerie / cycle de vie).
--
-- À exécuter dans l'éditeur SQL du dashboard Supabase, après 0012.

alter table public.messages
  add column type text not null default 'texte' check (type in ('texte', 'systeme'));
