-- ProParJour — Migration 0012
-- Ajoute un lien structuré vers la mission concernée sur chaque
-- notification, pour permettre aux tableaux de bord de rafraîchir
-- uniquement la carte mission concernée en Realtime (au lieu de
-- reparser l'URL texte `lien`).
--
-- À exécuter dans l'éditeur SQL du dashboard Supabase, après 0011.

alter table public.notifications
  add column mission_id uuid references public.missions (id) on delete cascade;

create index notifications_mission_id_idx on public.notifications (mission_id);
