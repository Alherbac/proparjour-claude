-- ProParJour — Migration 0031
-- Bloc 9 : à l'acceptation d'une candidature, la mission (et donc la
-- conversation, qui n'existe qu'au sein d'une mission — voir
-- 0010_messages.sql, mission_id NOT NULL) doit exister immédiatement,
-- AVANT le paiement — contrairement au flux panier existant
-- (creer_mission_payee, 0007/0022) où le paiement précède toujours la
-- création de la mission. On introduit donc un second chemin de
-- création, avec un paiement en_attente dès le départ (l'enum
-- paiement_statut_type porte déjà cette valeur, simplement jamais
-- atteinte par le code actuel).
--
-- À exécuter dans l'éditeur SQL du dashboard Supabase, après 0030.

-- ============================================================
-- Traçabilité : d'où vient une mission née d'une candidature
-- ============================================================

alter table public.missions add column offre_id uuid references public.offres (id) on delete set null;
alter table public.missions add column candidature_id uuid references public.candidatures (id) on delete set null;

-- Une candidature ne peut donner naissance qu'à une seule mission —
-- index partiel car les missions du flux panier existant (booking
-- direct, sans candidature) ont candidature_id null.
create unique index missions_candidature_id_key on public.missions (candidature_id) where candidature_id is not null;
create index missions_offre_id_idx on public.missions (offre_id);

-- ============================================================
-- Messages structurés : carte "devis" affichable dans le fil
-- ============================================================
-- contenu reste le texte de repli (accessibilité, notifications) ;
-- metadata porte la structure exploitée par le rendu riche côté
-- client (prestation/date/horaires/lieu/tarif/total).

alter table public.messages add column metadata jsonb;

alter table public.messages drop constraint if exists messages_type_check;
alter table public.messages add constraint messages_type_check check (type in ('texte', 'systeme', 'devis'));

-- ============================================================
-- Fonction transactionnelle : mission née d'une candidature acceptée
-- ============================================================
-- Le prestataire a déjà candidaté (son consentement est acquis) : la
-- ligne est créée directement 'acceptee', contrairement au flux panier
-- où le prestataire n'a encore rien confirmé au moment du paiement.
-- Le paiement est créé 'en_attente' (pas de stripe_payment_intent_id
-- pour l'instant) — confirmer_paiement_mission le fera basculer une
-- fois le paiement Stripe confirmé.

create or replace function public.creer_mission_depuis_candidature(
  p_recruteur_id uuid,
  p_offre_id uuid,
  p_candidature_id uuid,
  p_prestataire_id uuid,
  p_metier public.metier_type,
  p_lieu text,
  p_date_mission date,
  p_heure_debut time,
  p_heure_fin time,
  p_tarif_applique numeric,
  p_montant_total numeric,
  p_taux_commission numeric,
  p_montant_commission numeric,
  p_description text default null
)
returns uuid
language plpgsql
as $$
declare
  v_mission_id uuid;
begin
  insert into public.missions (recruteur_id, offre_id, candidature_id, lieu, date_mission, montant_total, description)
  values (p_recruteur_id, p_offre_id, p_candidature_id, p_lieu, p_date_mission, p_montant_total, p_description)
  returning id into v_mission_id;

  insert into public.mission_lignes (
    mission_id, prestataire_id, metier, heure_debut, heure_fin, tarif_applique, statut_acceptation
  )
  values (
    v_mission_id, p_prestataire_id, p_metier, p_heure_debut, p_heure_fin, p_tarif_applique, 'acceptee'
  );

  insert into public.paiements (
    mission_id, montant, statut, taux_commission, montant_commission
  )
  values (
    v_mission_id, p_montant_total, 'en_attente', p_taux_commission, p_montant_commission
  );

  return v_mission_id;
end;
$$;

revoke execute on function public.creer_mission_depuis_candidature from public, anon, authenticated;
grant execute on function public.creer_mission_depuis_candidature to service_role;

-- ============================================================
-- Fonction transactionnelle : confirmation du paiement inline
-- ============================================================
-- Symétrique de la partie "paiement" de creer_mission_payee, mais sur
-- une mission (et un paiement) déjà existants. `where statut =
-- 'en_attente'` rend l'appel idempotent-sûr : un double clic ou un
-- retry ne peut pas faire passer un paiement déjà séquestré à nouveau
-- par cette fonction avec un second stripe_payment_intent_id.

create or replace function public.confirmer_paiement_mission(
  p_mission_id uuid,
  p_stripe_payment_intent_id text
)
returns void
language plpgsql
as $$
begin
  update public.paiements
  set statut = 'sequestre', stripe_payment_intent_id = p_stripe_payment_intent_id
  where mission_id = p_mission_id and statut = 'en_attente';

  if not found then
    raise exception 'Paiement introuvable ou déjà traité pour cette mission.';
  end if;

  update public.missions set statut = 'confirmee' where id = p_mission_id;
end;
$$;

revoke execute on function public.confirmer_paiement_mission from public, anon, authenticated;
grant execute on function public.confirmer_paiement_mission to service_role;
