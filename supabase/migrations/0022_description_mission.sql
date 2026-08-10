-- ProParJour — Migration 0022
-- Ajoute une description libre à la mission, renseignée par le
-- recruteur au moment de proposer une mission (voir booking-card.tsx
-- et ajouter-mission-popover.tsx). `lieu` porte déjà une adresse
-- précise par mission (une mission = un événement, une date, un
-- lieu) — un panier multi-prestataires avec des adresses/dates
-- différentes par prestataire est scindé en plusieurs missions côté
-- application (voir finaliserCommande dans actions/commande.ts),
-- donc aucun changement de modèle nécessaire ici au-delà de la
-- description.

alter table public.missions add column description text;

create or replace function public.creer_mission_payee(
  p_recruteur_id uuid,
  p_lieu text,
  p_date_mission date,
  p_lignes jsonb,
  p_montant_total numeric,
  p_taux_commission numeric,
  p_montant_commission numeric,
  p_stripe_payment_intent_id text,
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
      mission_id, prestataire_id, metier, heure_debut, heure_fin, tarif_applique
    )
    values (
      v_mission_id,
      (v_ligne ->> 'prestataire_id')::uuid,
      (v_ligne ->> 'metier')::public.metier_type,
      (v_ligne ->> 'heure_debut')::time,
      (v_ligne ->> 'heure_fin')::time,
      (v_ligne ->> 'tarif_applique')::numeric
    );
  end loop;

  insert into public.paiements (
    mission_id, montant, statut, taux_commission, montant_commission, stripe_payment_intent_id
  )
  values (
    v_mission_id, p_montant_total, 'sequestre', p_taux_commission, p_montant_commission, p_stripe_payment_intent_id
  );

  return v_mission_id;
end;
$$;

revoke execute on function public.creer_mission_payee from public, anon, authenticated;
grant execute on function public.creer_mission_payee to service_role;
