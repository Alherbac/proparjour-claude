-- ProParJour — Migration 0037
-- Catégorie B, point 8 : système d'avis et notation (étape 8 du
-- cahier des charges, jusqu'ici à zéro — cf. lib/plateforme-stats.ts
-- qui interdisait explicitement d'afficher une note tant que cette
-- table n'existait pas).
--
-- Notation bidirectionnelle par LIGNE de mission (une ligne = un
-- prestataire sur une mission) plutôt que par mission : un recruteur
-- multi-prestataires note chaque prestataire séparément, et chaque
-- prestataire note le recruteur une fois par ligne où il est
-- intervenu. `unique (mission_ligne_id, auteur_id)` empêche qu'un
-- même auteur note deux fois la même ligne, dans un sens comme dans
-- l'autre.
--
-- Comme pour missions/paiements/versements_prestataires, aucune
-- policy INSERT/UPDATE cliente : l'éligibilité (mission réellement
-- terminée, auteur réellement participant) est une logique métier
-- vérifiée côté serveur (nouvelle Server Action laisserAvis), pas au
-- niveau RLS.
--
-- À exécuter dans l'éditeur SQL du dashboard Supabase, après 0036.

create table public.avis (
  id uuid primary key default gen_random_uuid(),
  mission_ligne_id uuid not null references public.mission_lignes (id) on delete cascade,
  auteur_id uuid not null references public.users (id) on delete cascade,
  cible_id uuid not null references public.users (id) on delete cascade,
  note smallint not null check (note >= 1 and note <= 5),
  commentaire text,
  created_at timestamptz not null default now(),
  unique (mission_ligne_id, auteur_id)
);

alter table public.avis enable row level security;

-- Lecture : l'auteur, la cible, l'admin/modérateur, ou tout le monde
-- si la cible est un prestataire dont la fiche est publique (même
-- condition que la vue prestataires_publics) — c'est justement ce
-- dernier cas qui alimente la fiche professionnelle publique.
create policy "avis_select_participant_ou_public_ou_admin"
  on public.avis for select
  using (
    auteur_id = auth.uid()
    or cible_id = auth.uid()
    or public.has_role('admin')
    or public.has_role('moderator')
    or exists (
      select 1
      from public.prestataires_profils pp
      where pp.user_id = avis.cible_id
        and pp.statut_verification = 'valide'
        and pp.visible = true
    )
  );

-- Vue publique — même modèle que prestataires_publics : la vue,
-- propriété du rôle qui l'a créée, peut joindre `users` (dont la
-- lecture directe n'est pas ouverte à anon/authenticated) pour
-- n'exposer que le prénom de l'auteur de l'avis, jamais son nom
-- complet ni son id de compte recruteur.
create view public.avis_publics as
select
  a.id,
  pp.id as prestataire_id,
  a.note,
  a.commentaire,
  a.created_at,
  u.prenom as auteur_prenom
from public.avis a
join public.users u on u.id = a.auteur_id
join public.prestataires_profils pp on pp.user_id = a.cible_id
where pp.statut_verification = 'valide' and pp.visible = true
order by a.created_at desc;

grant select on public.avis_publics to anon, authenticated;

-- Agrégat public (note moyenne + nombre d'avis) par prestataire — même
-- modèle que prestataires_fiabilite (0027_matching_rpcs.sql).
create or replace function public.avis_moyenne_prestataires()
returns table (prestataire_id uuid, note_moyenne numeric, nb_avis bigint)
language sql
security definer
set search_path = public
stable
as $$
  select
    pp.id as prestataire_id,
    round(avg(a.note)::numeric, 1) as note_moyenne,
    count(*) as nb_avis
  from public.avis a
  join public.prestataires_profils pp on pp.user_id = a.cible_id
  group by pp.id;
$$;

revoke all on function public.avis_moyenne_prestataires() from public;
grant execute on function public.avis_moyenne_prestataires() to anon, authenticated;

create index avis_mission_ligne_id_idx on public.avis (mission_ligne_id);
create index avis_cible_id_idx on public.avis (cible_id);
