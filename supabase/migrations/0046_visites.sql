-- ProParJour — Migration 0046
-- Mesure d'audience minimale, de première partie, gardée par le
-- consentement RGPD déjà collecté (catégorie "audience", voir
-- src/lib/cookie-consent.ts — jusqu'ici sans aucun outil réel
-- branché derrière). Alimente les tuiles "non mesuré" du back-office
-- (Tableau de bord, Statistiques, Insights) dès que du vrai trafic
-- est enregistré — rien n'est rétroactif, rien n'est inventé
-- avant ça.
--
-- Une ligne = une vue de page. `session_id` est un identifiant
-- aléatoire généré côté client (sessionStorage, jamais partagé entre
-- onglets ni persisté après fermeture) — pas de cookie tiers, pas de
-- fingerprinting, aucune donnée personnelle stockée.
--
-- À exécuter dans l'éditeur SQL du dashboard Supabase, après 0045.

create table public.visites (
  id uuid primary key default gen_random_uuid(),
  chemin text not null,
  session_id text not null,
  appareil text not null check (appareil in ('mobile', 'desktop')),
  created_at timestamptz not null default now()
);

alter table public.visites enable row level security;

-- Écriture ouverte (visiteur anonyme, avant/sans compte) — l'API
-- route qui insère fait déjà un contrôle de débit par IP ; aucune
-- lecture n'est permise par cette policy.
create policy "visites_insert_public"
  on public.visites for insert
  with check (true);

create policy "visites_select_admin_ou_moderateur"
  on public.visites for select
  using (public.has_role('admin') or public.has_role('moderator'));

create index visites_created_at_idx on public.visites (created_at desc);
create index visites_session_id_idx on public.visites (session_id);

-- Ménage automatique : au-delà de 90 jours, seuls les agrégats
-- (déjà affichés côté admin) comptent — pas besoin de conserver le
-- détail ligne à ligne indéfiniment.
create or replace function public.purger_vieilles_visites()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.visites where created_at < now() - interval '90 days';
$$;
