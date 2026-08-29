-- ProParJour — Migration 0034
-- Webhook Stripe (catégorie B, liste "audit consolidé" du 2026-08-23,
-- point 2) : jusqu'ici la confirmation d'un paiement panier
-- (creerIntentionPaiement / finaliserCommande, actions/commande.ts)
-- dépendait entièrement d'un second appel déclenché par le NAVIGATEUR
-- après le retour de Stripe Elements — si l'onglet se ferme juste
-- après un paiement réussi, la mission n'était jamais créée bien que
-- l'argent ait été prélevé. Ces deux tables permettent au webhook de
-- finaliser la commande côté serveur, indépendamment du client.
--
-- commandes_en_attente : snapshot des lignes du panier au moment de
-- la création du PaymentIntent, pour que le webhook puisse recréer
-- les missions sans dépendre du localStorage du navigateur (qui ne
-- lui est jamais accessible). Aucune policy RLS : lu/écrit
-- exclusivement via le rôle service (server actions + webhook), comme
-- justificatifs/paiements le sont déjà pour leurs écritures sensibles.
create table if not exists public.commandes_en_attente (
  payment_intent_id text primary key,
  recruteur_id uuid not null references public.users (id),
  lignes jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.commandes_en_attente enable row level security;

-- webhook_events_traites : déduplication au niveau de l'événement
-- Stripe lui-même (livraison "at-least-once" — un même event.id peut
-- arriver plusieurs fois). Complète l'idempotence déjà existante par
-- état (vérifier stripe_payment_intent_id avant de créer une mission)
-- avec une garde au niveau de l'événement, avant même de le traiter.
create table if not exists public.webhook_events_traites (
  event_id text primary key,
  type text not null,
  created_at timestamptz not null default now()
);
alter table public.webhook_events_traites enable row level security;
