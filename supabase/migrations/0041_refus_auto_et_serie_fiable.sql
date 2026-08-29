-- 1) Distingue, sur mission_lignes, un refus explicite du prestataire
-- (via repondreMissionLigne) d'un refus automatique déclenché par le
-- paiement (migration 0040, confirmer_paiement_mission : toute ligne
-- encore 'en_attente' au moment du paiement passe à 'refusee') — sans
-- cette distinction, l'UI affichait le même badge "Refusée" dans les
-- deux cas, alors que dans le second cas le prestataire n'a parfois
-- jamais eu l'occasion de répondre (mission déjà pourvue ailleurs).
-- Colonne nullable en pratique (default false), aucune ligne
-- existante n'est réinterprétée rétroactivement : on ne peut pas
-- savoir après coup si un refus déjà en base était explicite ou
-- automatique, donc aucune régression sur les données déjà écrites.
alter table public.mission_lignes
  add column if not exists refus_automatique boolean not null default false;

create or replace function public.confirmer_paiement_mission(
  p_mission_id uuid, p_stripe_payment_intent_id text, p_montant numeric default null
) returns void language plpgsql as $$
begin
  update public.paiements set statut='sequestre', stripe_payment_intent_id=p_stripe_payment_intent_id,
    montant = coalesce(p_montant, montant) where mission_id=p_mission_id and statut='en_attente';
  if not found then raise exception 'Paiement introuvable ou déjà traité pour cette mission.'; end if;
  update public.missions set statut='confirmee', montant_total = coalesce(p_montant, montant_total) where id=p_mission_id;
  update public.mission_lignes set statut_acceptation='refusee', refus_automatique = true
    where mission_id=p_mission_id and statut_acceptation='en_attente';
end; $$;

-- 2) commandes_en_attente.serie_id : jusqu'ici, le rattachement d'une
-- mission créée par "Créer une série récurrente" à sa série reposait
-- uniquement sur un appel côté navigateur (rattacherMissionsASerie,
-- déclenché par CheckoutForm juste après le paiement) — si l'onglet
-- se ferme entre la confirmation Stripe et cet appel, le webhook crée
-- bien la mission (filet de sécurité existant) mais ne la rattache
-- jamais à sa série, faute de connaître son id. Ce snapshot, déjà
-- utilisé par le webhook pour reconstruire le panier, porte
-- maintenant aussi l'id de série le cas échéant, pour que
-- finaliserCommandeAvecLignes (partagée par les deux chemins) puisse
-- fiabiliser ce rattachement quel que soit celui qui traite le
-- paiement. Nullable : n'affecte aucune commande hors "série".
alter table public.commandes_en_attente
  add column if not exists serie_id uuid references public.series_missions (id);
