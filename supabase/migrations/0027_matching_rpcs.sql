-- Moteur de recommandation (Bloc 3) — deux fonctions SECURITY DEFINER
-- qui exposent uniquement des agrégats/identifiants publiquement
-- consultables, sur le même modèle que prestataires_en_mission_ids()
-- (0021_badge_en_mission.sql) : aucune nouvelle table, aucune donnée
-- brute (mission, exception détaillée) n'est exposée.

-- Prestataires ayant une exception d'indisponibilité pour une date
-- donnée (prestataires_disponibilites_exceptions n'est pas lisible
-- publiquement — seule cette liste d'ids l'est).
create or replace function public.prestataires_indisponibles_le(p_date date)
returns table (prestataire_id uuid)
language sql
security definer
set search_path = public
stable
as $$
  select prestataire_id
  from public.prestataires_disponibilites_exceptions
  where date = p_date and disponible = false;
$$;

revoke all on function public.prestataires_indisponibles_le(date) from public;
grant execute on function public.prestataires_indisponibles_le(date) to anon, authenticated;

-- Fiabilité agrégée par prestataire — missions terminées et litiges,
-- comptés uniquement sur les lignes que le prestataire a réellement
-- acceptées (statut_acceptation = 'acceptee'). Réutilisé par
-- lib/matching.ts avec calculerScoreRisque (déjà utilisé côté admin).
create or replace function public.prestataires_fiabilite()
returns table (prestataire_id uuid, missions_terminees bigint, nb_litiges bigint)
language sql
security definer
set search_path = public
stable
as $$
  select
    ml.prestataire_id,
    count(*) filter (where m.statut = 'terminee') as missions_terminees,
    count(*) filter (where m.statut = 'litige') as nb_litiges
  from public.mission_lignes ml
  join public.missions m on m.id = ml.mission_id
  where ml.statut_acceptation = 'acceptee'
  group by ml.prestataire_id;
$$;

revoke all on function public.prestataires_fiabilite() from public;
grant execute on function public.prestataires_fiabilite() to anon, authenticated;
