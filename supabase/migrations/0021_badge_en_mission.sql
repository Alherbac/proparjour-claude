-- ProParJour — Migration 0021
-- Badge "en mission" sur les fiches prestataires : `missions` et
-- `mission_lignes` n'ont pas de lecture publique (données
-- semi-privées, cf. 0018) — cette fonction expose uniquement les IDs
-- des prestataires actuellement en mission (statut 'en_cours' +
-- ligne acceptée), sans exposer le détail de la mission elle-même.
--
-- À exécuter dans l'éditeur SQL du dashboard Supabase, après 0020.

create or replace function public.prestataires_en_mission_ids()
returns table (prestataire_id uuid)
language sql
security definer
set search_path = public
stable
as $$
  select distinct ml.prestataire_id
  from mission_lignes ml
  join missions m on m.id = ml.mission_id
  where m.statut = 'en_cours' and ml.statut_acceptation = 'acceptee';
$$;

grant execute on function public.prestataires_en_mission_ids() to anon, authenticated;
