-- ProParJour — Migration 0062
-- Mission multi-jours (validation produit) : une mission (ou une
-- offre, avant transformation) peut désormais comporter plusieurs
-- journées, chacune avec sa propre date et ses propres horaires,
-- plutôt qu'une seule paire heure_debut/heure_fin par ligne.
--
-- PRINCIPE DIRECTEUR : jamais deux systèmes métier. Une mission d'un
-- seul jour reste exactement UNE mission + UNE mission_ligne, mais
-- avec désormais UNE journée dans `mission_lignes_journees` — le cas
-- "1 jour" est le cas N=1 du modèle général, jamais une branche à
-- part. Idem côté offres.
--
-- PÉRIMÈTRE DES FONCTIONS TOUCHÉES — vérifié précisément avant
-- d'écrire cette migration (aucune fonctionnalité sans rapport) :
--   - creer_mission_proposee (0040) : c'est ELLE qu'utilise le
--     parcours panier → "Proposer la mission" (voir
--     actions/proposition.ts::proposerMission, confirmé par grep).
--     Modifiée ci-dessous pour accepter des journées par ligne.
--   - creer_mission_depuis_candidature (0031) : parcours "Publier une
--     offre" → candidature retenue. Modifiée ci-dessous.
--   - creer_mission_payee (0007/0022) : JAMAIS TOUCHÉE ICI — elle ne
--     sert plus "Proposer la mission" depuis 0040, mais "Refaire une
--     mission" et "Créer une série récurrente" (commande.ts), deux
--     parcours hors périmètre de cette évolution. La laisser inchangée
--     évite tout risque de régression sur des fonctionnalités déjà
--     validées et sans rapport avec cette demande.
--
-- Ce que cette migration NE fait PAS : elle n'ajoute ni ne modifie
-- aucune colonne existante sur `mission_lignes`/`offres`/`missions`.
-- Les colonnes plates actuelles (heure_debut, heure_fin, tarif_final,
-- le suivi d'exécution de la migration 0059) restent en place,
-- inchangées, pour ne strictement rien casser côté lecture existante
-- pendant la mise à jour progressive du code applicatif (chantiers
-- suivants). `mission_lignes_journees` devient la source de vérité
-- pour les dates/horaires/exécution ; `mission_lignes` continuera à
-- porter `tarif_applique`/`tarif_final` comme des SOMMES sur ses
-- journées (recalculées côté application, même principe déjà en
-- place pour `resynchroniserMontantPaiement`, jamais un trigger SQL
-- caché) — ce recalcul est un chantier de code, pas de cette migration.
--
-- À exécuter dans l'éditeur SQL du dashboard Supabase, après 0061.

-- ============================================================
-- 1. mission_lignes_journees — une ligne = une journée pour un
--    prestataire sur une mission donnée.
-- ============================================================
-- Mêmes colonnes d'exécution que mission_lignes (migration 0059),
-- déplacées ici pour permettre plusieurs déclarations (une par
-- journée) au lieu d'une seule par ligne.

create table public.mission_lignes_journees (
  id uuid primary key default gen_random_uuid(),
  mission_ligne_id uuid not null references public.mission_lignes (id) on delete cascade,
  date date not null,
  heure_debut time not null,
  heure_fin time not null,
  tarif_applique numeric(10, 2) not null check (tarif_applique > 0),

  -- Suivi d'exécution — un couple déclaration/confirmation par
  -- journée, même sémantique que mission_lignes avant cette migration.
  heure_debut_reelle time,
  heure_debut_declaree_le timestamptz,
  heure_debut_declaree_par uuid references public.users (id),
  heure_debut_statut text check (heure_debut_statut in ('declaree', 'confirmee', 'contestee')),
  motif_contestation_debut text,
  heure_fin_reelle time,
  heure_fin_declaree_le timestamptz,
  heure_fin_declaree_par uuid references public.users (id),
  heure_fin_statut text check (heure_fin_statut in ('declaree', 'confirmee', 'contestee')),
  motif_contestation_fin text,
  tarif_final numeric(10, 2) check (tarif_final is null or tarif_final > 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Même exception que mission_lignes (0007) : une mission de nuit a
  -- une heure de fin "avant" l'heure de début sur l'horloge — la
  -- contrainte ne vérifie que la non-égalité, la durée réelle se
  -- calcule côté application (lib/duree.ts).
  check (heure_fin <> heure_debut),
  -- Une seule journée par date pour une même ligne — pas de doublon
  -- silencieux si le formulaire est soumis deux fois pour le même jour.
  unique (mission_ligne_id, date)
);

create trigger mission_lignes_journees_set_updated_at
  before update on public.mission_lignes_journees
  for each row execute function public.set_updated_at();

alter table public.mission_lignes_journees enable row level security;

-- Même lectorat que mission_lignes elle-même (recruteur de la
-- mission, prestataire de la ligne, ou admin) — jamais de policy
-- INSERT/UPDATE pour un utilisateur normal : comme mission_lignes,
-- cette table n'est mutée que par le client admin (service_role),
-- toute la logique métier (cohérence des journées avec le devis/le
-- paiement) restant côté serveur.
create policy "mission_lignes_journees_select_recruteur_prestataire_ou_admin"
  on public.mission_lignes_journees for select
  using (
    public.is_admin()
    or exists (
      select 1
      from public.mission_lignes ml
      join public.missions m on m.id = ml.mission_id
      where ml.id = mission_lignes_journees.mission_ligne_id
        and m.recruteur_id = auth.uid()
    )
    or exists (
      select 1
      from public.mission_lignes ml
      join public.prestataires_profils pp on pp.id = ml.prestataire_id
      where ml.id = mission_lignes_journees.mission_ligne_id
        and pp.user_id = auth.uid()
    )
  );

create index mission_lignes_journees_mission_ligne_id_idx on public.mission_lignes_journees (mission_ligne_id);
create index mission_lignes_journees_date_idx on public.mission_lignes_journees (date);

-- ============================================================
-- 2. offres_journees — même principe côté offre (avant qu'elle ne
--    devienne une mission).
-- ============================================================
-- Contrairement à mission_lignes, `offres` est écrite directement par
-- le recruteur via le client de session (RLS, voir 0023) — cette
-- table enfant a donc besoin de ses propres policies INSERT/UPDATE/
-- DELETE, pas seulement SELECT.

create table public.offres_journees (
  id uuid primary key default gen_random_uuid(),
  offre_id uuid not null references public.offres (id) on delete cascade,
  date date not null,
  heure_debut time not null,
  heure_fin time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (heure_fin <> heure_debut),
  unique (offre_id, date)
);

-- offres_journees est modifiable directement par le recruteur
-- propriétaire (voir policies UPDATE ci-dessous, contrairement à
-- mission_lignes_journees) : updated_at + trigger, comme sur `offres`
-- elle-même (0023), pour tracer ces modifications.
create trigger offres_journees_set_updated_at
  before update on public.offres_journees
  for each row execute function public.set_updated_at();

alter table public.offres_journees enable row level security;

-- Même visibilité que la ligne "offres" correspondante (marché
-- ouvert : publiée = visible de tous, sinon réservé au propriétaire).
create policy "offres_journees_select_publiees_ou_proprietaire_ou_admin"
  on public.offres_journees for select
  using (
    exists (
      select 1 from public.offres o
      where o.id = offres_journees.offre_id
        and (o.statut = 'publiee' or o.recruteur_id = auth.uid() or public.is_admin())
    )
  );

create policy "offres_journees_insert_proprietaire"
  on public.offres_journees for insert
  with check (
    exists (
      select 1 from public.offres o
      where o.id = offres_journees.offre_id and o.recruteur_id = auth.uid()
    )
  );

create policy "offres_journees_update_proprietaire_ou_admin"
  on public.offres_journees for update
  using (
    public.is_admin()
    or exists (select 1 from public.offres o where o.id = offres_journees.offre_id and o.recruteur_id = auth.uid())
  )
  with check (
    public.is_admin()
    or exists (select 1 from public.offres o where o.id = offres_journees.offre_id and o.recruteur_id = auth.uid())
  );

create policy "offres_journees_delete_proprietaire_ou_admin"
  on public.offres_journees for delete
  using (
    public.is_admin()
    or exists (select 1 from public.offres o where o.id = offres_journees.offre_id and o.recruteur_id = auth.uid())
  );

create index offres_journees_offre_id_idx on public.offres_journees (offre_id);

-- ============================================================
-- 3. Backfill — chaque mission_ligne / offre existante reçoit UNE
--    journée, copie exacte de ses colonnes actuelles. Rien n'est
--    perdu ni modifié fonctionnellement : c'est strictement le cas
--    N=1 du nouveau modèle.
--
--    Idempotent via `where not exists` : si ce backfill est rejoué
--    après une exécution partielle (script interrompu avant la
--    section 4, puis relancé), aucune ligne existante de
--    mission_lignes_journees / offres_journees n'est dupliquée — pas
--    de dépendance à une transaction englobante pour cette garantie.
--    Pas de `begin;`/`commit;` explicite ici : aucune autre migration
--    de ce projet n'en utilise (convention constatée), on ne
--    l'introduit donc pas isolément sur celle-ci.
-- ============================================================

insert into public.mission_lignes_journees (
  mission_ligne_id, date, heure_debut, heure_fin, tarif_applique,
  heure_debut_reelle, heure_debut_declaree_le, heure_debut_declaree_par, heure_debut_statut, motif_contestation_debut,
  heure_fin_reelle, heure_fin_declaree_le, heure_fin_declaree_par, heure_fin_statut, motif_contestation_fin,
  tarif_final, created_at
)
select
  ml.id, m.date_mission, ml.heure_debut, ml.heure_fin, ml.tarif_applique,
  ml.heure_debut_reelle, ml.heure_debut_declaree_le, ml.heure_debut_declaree_par, ml.heure_debut_statut, ml.motif_contestation_debut,
  ml.heure_fin_reelle, ml.heure_fin_declaree_le, ml.heure_fin_declaree_par, ml.heure_fin_statut, ml.motif_contestation_fin,
  ml.tarif_final, ml.created_at
from public.mission_lignes ml
join public.missions m on m.id = ml.mission_id
where not exists (
  select 1 from public.mission_lignes_journees mlj where mlj.mission_ligne_id = ml.id
);

insert into public.offres_journees (offre_id, date, heure_debut, heure_fin, created_at)
select o.id, o.date_mission, o.heure_debut, o.heure_fin, o.created_at
from public.offres o
where not exists (
  select 1 from public.offres_journees oj where oj.offre_id = o.id
);

-- ============================================================
-- 4. Fonctions transactionnelles — SEULES celles listées en tête de
--    fichier sont modifiées.
--
--    - creer_mission_depuis_candidature : la signature SQL change
--      (nouveau paramètre p_journees) → `drop function` explicite
--      avant `create function`, sinon `create or replace` créerait
--      une DEUXIÈME fonction (surcharge) au lieu de remplacer
--      l'existante — même piège déjà rencontré et corrigé pour
--      confirmer_paiement_mission (voir 0040).
--    - creer_mission_proposee : la signature SQL NE change PAS (voir
--      ci-dessous) → `create or replace function` suffit, aucun
--      `drop` n'est nécessaire ni présent.
--
--    `set search_path = public` explicitement réajouté sur les deux
--    (durcissement de 0051, sinon perdu par le DROP/CREATE de
--    creer_mission_depuis_candidature).
-- ============================================================

-- creer_mission_proposee : signature SQL INCHANGÉE (toujours 8
-- paramètres) — "journees" est une clé OPTIONNELLE ajoutée à
-- l'intérieur de chaque élément du jsonb p_lignes déjà existant, pas
-- un nouveau paramètre de la fonction. Absente (ancien appelant) : on
-- retombe sur l'unique paire heure_debut/heure_fin/tarif_applique de
-- la ligne + p_date_mission, exactement le comportement actuel.
-- `mission_lignes.heure_debut/heure_fin` restent ceux de la PREMIÈRE
-- journée de la ligne (tri/affichage existants inchangés) ;
-- `tarif_applique` devient la somme des journées de cette ligne.
--
-- CONTRAT p_date_mission (à respecter par le code appelant, Phase 2) :
-- cette fonction traite potentiellement PLUSIEURS lignes/prestataires,
-- chacune avec son propre jeu de journées — elle ne peut donc pas
-- déduire seule "la date la plus ancienne" tous prestataires
-- confondus (contrairement à creer_mission_depuis_candidature, qui ne
-- gère qu'une seule ligne et peut le faire elle-même). C'est au code
-- appelant TypeScript de calculer p_date_mission = date la plus
-- ancienne parmi les journées de TOUTES les lignes, avant l'appel RPC.
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
set search_path = public
as $$
declare
  v_mission_id uuid;
  v_ligne jsonb;
  v_ligne_id uuid;
  v_journees jsonb;
  v_journee jsonb;
  v_total_ligne numeric;
begin
  insert into public.missions (recruteur_id, lieu, date_mission, montant_total, description)
  values (p_recruteur_id, p_lieu, p_date_mission, p_montant_total, p_description)
  returning id into v_mission_id;

  for v_ligne in select * from jsonb_array_elements(p_lignes)
  loop
    v_journees := case
      when v_ligne ? 'journees' then v_ligne -> 'journees'
      else jsonb_build_array(jsonb_build_object(
        'date', p_date_mission,
        'heure_debut', v_ligne ->> 'heure_debut',
        'heure_fin', v_ligne ->> 'heure_fin',
        'tarif_applique', v_ligne ->> 'tarif_applique'
      ))
    end;

    select coalesce(sum((j ->> 'tarif_applique')::numeric), 0) into v_total_ligne
    from jsonb_array_elements(v_journees) j;

    insert into public.mission_lignes (
      mission_id, prestataire_id, metier, heure_debut, heure_fin, tarif_applique, statut_acceptation
    )
    values (
      v_mission_id,
      (v_ligne ->> 'prestataire_id')::uuid,
      (v_ligne ->> 'metier')::public.metier_type,
      ((v_journees -> 0) ->> 'heure_debut')::time,
      ((v_journees -> 0) ->> 'heure_fin')::time,
      v_total_ligne,
      'en_attente'
    )
    returning id into v_ligne_id;

    for v_journee in select * from jsonb_array_elements(v_journees)
    loop
      insert into public.mission_lignes_journees (mission_ligne_id, date, heure_debut, heure_fin, tarif_applique)
      values (
        v_ligne_id,
        (v_journee ->> 'date')::date,
        (v_journee ->> 'heure_debut')::time,
        (v_journee ->> 'heure_fin')::time,
        (v_journee ->> 'tarif_applique')::numeric
      );
    end loop;
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

-- creer_mission_depuis_candidature : nouveau paramètre p_journees
-- (jsonb, tableau de {date, heure_debut, heure_fin, tarif_applique}),
-- défaut NULL — un appelant non mis à jour continue de fonctionner
-- exactement comme avant (une seule journée dérivée de
-- p_date_mission/p_heure_debut/p_heure_fin/p_tarif_applique).
-- missions.date_mission devient la date de la PREMIÈRE journée
-- fournie (règle produit §7 : conservé comme référence de tri/
-- affichage, jamais rendu nullable).
--
-- Cohérence financière (corrigé) : mission_lignes.heure_debut/
-- heure_fin/tarif_applique sont désormais TOUJOURS DÉRIVÉS de
-- v_journees à l'intérieur de la fonction — heure_debut de la
-- première journée (date la plus ancienne), heure_fin de la dernière
-- (date la plus récente), tarif_applique = somme des tarif_applique
-- de toutes les journées. Les paramètres p_heure_debut/p_heure_fin/
-- p_tarif_applique ne servent plus qu'à construire le tableau de
-- repli à une seule journée quand p_journees est NULL — jamais
-- utilisés directement pour l'insertion de mission_lignes. Ceci
-- garantit qu'aucune divergence n'est possible entre
-- mission_lignes_journees (détail par jour) et mission_lignes.
-- tarif_applique (ce qui sert réellement au paiement et à la
-- commission, calculée une seule fois sur le total — voir
-- montantAPayer dans paiement-mission.ts).
drop function if exists public.creer_mission_depuis_candidature(uuid, uuid, uuid, uuid, metier_type, text, date, time, time, numeric, numeric, numeric, numeric, text);

create function public.creer_mission_depuis_candidature(
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
  p_description text default null,
  p_journees jsonb default null
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_mission_id uuid;
  v_ligne_id uuid;
  v_journees jsonb;
  v_journee jsonb;
  v_premiere_date date;
  v_heure_debut_ligne time;
  v_heure_fin_ligne time;
  v_total_ligne numeric;
begin
  v_journees := coalesce(p_journees, jsonb_build_array(jsonb_build_object(
    'date', p_date_mission, 'heure_debut', p_heure_debut, 'heure_fin', p_heure_fin, 'tarif_applique', p_tarif_applique
  )));
  select min((j ->> 'date')::date) into v_premiere_date from jsonb_array_elements(v_journees) j;

  -- mission_lignes.heure_debut/heure_fin/tarif_applique sont dérivés
  -- de v_journees, jamais des paramètres bruts p_heure_debut/
  -- p_heure_fin/p_tarif_applique : avec une seule journée (repli
  -- ci-dessus), le résultat est mathématiquement identique à avant —
  -- mais avec plusieurs journées, ceci empêche toute divergence entre
  -- le détail par jour et le montant qui sert au paiement/à la
  -- commission (règle produit : total mission = somme des journées).
  select (j ->> 'heure_debut')::time into v_heure_debut_ligne
  from jsonb_array_elements(v_journees) j
  order by (j ->> 'date')::date asc
  limit 1;

  select (j ->> 'heure_fin')::time into v_heure_fin_ligne
  from jsonb_array_elements(v_journees) j
  order by (j ->> 'date')::date desc
  limit 1;

  select coalesce(sum((j ->> 'tarif_applique')::numeric), 0) into v_total_ligne
  from jsonb_array_elements(v_journees) j;

  insert into public.missions (recruteur_id, offre_id, candidature_id, lieu, date_mission, montant_total, description)
  values (p_recruteur_id, p_offre_id, p_candidature_id, p_lieu, coalesce(v_premiere_date, p_date_mission), p_montant_total, p_description)
  returning id into v_mission_id;

  insert into public.mission_lignes (
    mission_id, prestataire_id, metier, heure_debut, heure_fin, tarif_applique, statut_acceptation
  )
  values (
    v_mission_id, p_prestataire_id, p_metier, v_heure_debut_ligne, v_heure_fin_ligne, v_total_ligne, 'acceptee'
  )
  returning id into v_ligne_id;

  for v_journee in select * from jsonb_array_elements(v_journees)
  loop
    insert into public.mission_lignes_journees (mission_ligne_id, date, heure_debut, heure_fin, tarif_applique)
    values (
      v_ligne_id,
      (v_journee ->> 'date')::date,
      (v_journee ->> 'heure_debut')::time,
      (v_journee ->> 'heure_fin')::time,
      (v_journee ->> 'tarif_applique')::numeric
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

revoke execute on function public.creer_mission_depuis_candidature from public, anon, authenticated;
grant execute on function public.creer_mission_depuis_candidature to service_role;
