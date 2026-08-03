-- ProParJour — Migration 0010
-- Étape 7B : messagerie recruteur ↔ prestataire liée à une mission
-- (cahier des charges 3.7). Un fil par binôme (mission, prestataire) —
-- sur une mission à plusieurs prestataires, chacun a son propre fil
-- avec le recruteur, pas un chat de groupe.
--
-- Comme pour missions/mission_lignes/paiements : aucune policy INSERT
-- n'est ouverte, toute écriture passe par une Server Action qui
-- vérifie que l'expéditeur est bien participant de la mission avant
-- d'écrire via le client admin.
--
-- À exécuter dans l'éditeur SQL du dashboard Supabase, après 0009.

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions (id) on delete cascade,
  expediteur_id uuid not null references public.users (id) on delete cascade,
  destinataire_id uuid not null references public.users (id) on delete cascade,
  contenu text not null,
  lu boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

-- Lecture : simple, pas de recherche croisée sur missions/mission_lignes
-- (donc aucun risque de récursion comme celui corrigé en 0008) — être
-- expéditeur ou destinataire d'un message suffit, la légitimité du
-- binôme est vérifiée une fois, à l'écriture, côté Server Action.
create policy "messages_select_participants_ou_admin"
  on public.messages for select
  using (
    auth.uid() = expediteur_id
    or auth.uid() = destinataire_id
    or public.is_admin()
  );

create index messages_mission_id_idx on public.messages (mission_id);
create index messages_destinataire_id_idx on public.messages (destinataire_id, lu);

-- Realtime : nécessaire pour que le fil de discussion se mette à jour
-- en direct sans recharger la page.
alter publication supabase_realtime add table public.messages;
