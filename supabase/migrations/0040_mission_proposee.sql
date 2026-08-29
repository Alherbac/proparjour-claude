-- ProParJour — Migration 0040
-- "proparjour 6-7" §8/§9 (RÉVISÉ) : troisième chemin de création de
-- mission, pour le nouveau parcours panier → "Proposer la mission".
--
-- Deux chemins existaient déjà :
-- - creer_mission_payee (0007/0022) — panier historique, paiement
--   AVANT la mission, ligne(s) 'en_attente' au départ (le prestataire
--   n'a encore rien confirmé au moment du paiement) — désormais
--   réservé aux parcours "réservation directe" (Refaire une mission,
--   Créer une série récurrente), qui reprennent une équipe déjà
--   connue et paient immédiatement.
-- - creer_mission_depuis_candidature (0031) — le prestataire a déjà
--   candidaté (son consentement est acquis), ligne créée directement
--   'acceptee', paiement 'en_attente' réglé ensuite via la carte de
--   devis en messagerie.
--
-- Le nouveau parcours panier → proposition est différent des deux :
-- PLUSIEURS lignes (potentiellement plusieurs métiers, plusieurs
-- personnes) sur UNE mission, mais AUCUN consentement encore acquis
-- pour aucune d'elles — d'où 'en_attente' comme creer_mission_payee,
-- mais un paiement qui doit lui aussi rester 'en_attente' comme
-- creer_mission_depuis_candidature (jamais débité avant qu'au moins
-- un professionnel ait accepté — voir confirmer_paiement_mission
-- ci-dessous, modifié pour recalculer le montant réel à payer plutôt
-- que de figer celui de la proposition initiale).
--
-- À exécuter dans l'éditeur SQL du dashboard Supabase, après 0039.

create or replace function public.creer_mission_proposee(
  p_recruteur_id uuid,
  p_lieu text,
  p_date_mission date,
  p_lignes jsonb,
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
  v_ligne jsonb;
begin
  insert into public.missions (recruteur_id, lieu, date_mission, montant_total, description)
  values (p_recruteur_id, p_lieu, p_date_mission, p_montant_total, p_description)
  returning id into v_mission_id;

  for v_ligne in select * from jsonb_array_elements(p_lignes)
  loop
    insert into public.mission_lignes (
      mission_id, prestataire_id, metier, heure_debut, heure_fin, tarif_applique, statut_acceptation
    )
    values (
      v_mission_id,
      (v_ligne ->> 'prestataire_id')::uuid,
      (v_ligne ->> 'metier')::public.metier_type,
      (v_ligne ->> 'heure_debut')::time,
      (v_ligne ->> 'heure_fin')::time,
      (v_ligne ->> 'tarif_applique')::numeric,
      'en_attente'
    );
  end loop;

  insert into public.paiements (
    mission_id, montant, statut, taux_commission, montant_commission
  )
  values (
    v_mission_id, p_montant_total, 'en_attente', p_taux_commission, p_montant_commission
  );

  return v_mission_id;
end;
$$;

revoke execute on function public.creer_mission_proposee from public, anon, authenticated;
grant execute on function public.creer_mission_proposee to service_role;

-- ============================================================
-- confirmer_paiement_mission — recalcul du montant réel à payer
-- ============================================================
-- Ajout d'un p_montant optionnel (défaut null = comportement
-- identique à avant, utilisé par le seul appelant existant qui n'a
-- pas besoin de le fournir explicitement au moment de l'écriture de
-- cette migration) : quand fourni, remplace le montant figé du
-- paiement par le montant réellement recalculé côté application
-- (somme des lignes réellement acceptées au moment du paiement —
-- jamais celui, potentiellement plus large, de la proposition
-- initiale). Met aussi à jour missions.montant_total pour que la
-- facture reflète le montant réel, et refuse automatiquement toute
-- ligne encore 'en_attente' à cet instant : une fois le paiement
-- effectué, la mission est arrêtée sur son périmètre réel — un
-- professionnel qui n'a pas encore répondu n'est plus engagé dessus
-- (point produit non tranché par le README, voir décision de lot :
-- "le client tranche" par défaut, même esprit ici appliqué au
-- périmètre payé plutôt qu'à un doublon de poste).

-- `create or replace function` ne remplace une fonction existante que
-- si la liste de paramètres correspond EXACTEMENT — ajouter p_montant
-- crée donc une DEUXIÈME fonction (surcharge) à côté de l'ancienne à
-- 2 arguments, plutôt que de la remplacer. Les instructions revoke/
-- grant qui suivent, sans liste d'arguments, deviennent alors
-- ambiguës entre les deux ("function name ... is not unique") —
-- d'où ce drop explicite de l'ancienne signature avant de recréer.
drop function if exists public.confirmer_paiement_mission(uuid, text);

create or replace function public.confirmer_paiement_mission(
  p_mission_id uuid,
  p_stripe_payment_intent_id text,
  p_montant numeric default null
)
returns void
language plpgsql
as $$
begin
  update public.paiements
  set statut = 'sequestre',
      stripe_payment_intent_id = p_stripe_payment_intent_id,
      montant = coalesce(p_montant, montant)
  where mission_id = p_mission_id and statut = 'en_attente';

  if not found then
    raise exception 'Paiement introuvable ou déjà traité pour cette mission.';
  end if;

  update public.missions
  set statut = 'confirmee',
      montant_total = coalesce(p_montant, montant_total)
  where id = p_mission_id;

  update public.mission_lignes
  set statut_acceptation = 'refusee'
  where mission_id = p_mission_id and statut_acceptation = 'en_attente';
end;
$$;

revoke execute on function public.confirmer_paiement_mission(uuid, text, numeric) from public, anon, authenticated;
grant execute on function public.confirmer_paiement_mission(uuid, text, numeric) to service_role;
