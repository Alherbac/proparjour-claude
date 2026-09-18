-- ProParJour — Migration 0060
-- Complément de paiement pour heures supplémentaires (validation
-- produit du 2026-09-18) : réutilise le pipeline Stripe existant
-- (PaymentIntent carte, même mécanisme que creerIntentionPaiementMission,
-- actions/paiement-mission.ts) pour UN SEUL complément par mission —
-- jamais Stripe Connect, jamais de transfert automatique, jamais un
-- second moteur financier. `paiements.montant`/`montant_commission`
-- reflètent déjà le nouveau total dès la confirmation des horaires
-- (resynchroniserMontantPaiement, actions/execution-mission.ts) ; ces
-- deux colonnes ne font que tracer si l'ARGENT correspondant a
-- réellement été encaissé avant de libérer le séquestre.
alter table public.paiements
  add column complement_montant_du numeric(10, 2) check (complement_montant_du is null or complement_montant_du > 0),
  add column complement_paye boolean not null default true,
  add column complement_stripe_payment_intent_id text;
