-- ProParJour — Migration 0008
-- Corrige une récursion RLS infinie découverte en testant (0007) :
-- la policy de `missions` référence `mission_lignes` dans un EXISTS,
-- et la policy de `mission_lignes` référence `missions` en retour —
-- chaque évaluation redéclenche l'autre à l'infini
-- ("infinite recursion detected in policy for relation missions").
--
-- Même principe de correction que is_admin() dans 0001_init.sql :
-- des fonctions SECURITY DEFINER qui court-circuitent la RLS pour ces
-- vérifications croisées précises, sans rouvrir l'accès aux tables.
--
-- À exécuter dans l'éditeur SQL du dashboard Supabase, après 0007.

create or replace function public.est_prestataire_sur_mission(p_mission_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from mission_lignes ml
    join prestataires_profils pp on pp.id = ml.prestataire_id
    where ml.mission_id = p_mission_id
      and pp.user_id = auth.uid()
  );
$$;

create or replace function public.est_recruteur_de_mission(p_mission_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from missions m
    where m.id = p_mission_id
      and m.recruteur_id = auth.uid()
  );
$$;

drop policy "missions_select_recruteur_prestataire_ou_admin" on public.missions;

create policy "missions_select_recruteur_prestataire_ou_admin"
  on public.missions for select
  using (
    auth.uid() = recruteur_id
    or public.is_admin()
    or public.est_prestataire_sur_mission(id)
  );

drop policy "mission_lignes_select_recruteur_prestataire_ou_admin" on public.mission_lignes;

create policy "mission_lignes_select_recruteur_prestataire_ou_admin"
  on public.mission_lignes for select
  using (
    public.is_admin()
    or public.est_recruteur_de_mission(mission_id)
    or exists (
      select 1 from public.prestataires_profils pp
      where pp.id = mission_lignes.prestataire_id and pp.user_id = auth.uid()
    )
  );
