-- ProParJour — Migration 0028
-- Bloc 7 : missions récurrentes et planification intelligente.
--
-- `series_missions` est la vue globale conservée côté client (titre,
-- lieu, fréquence, période) — même esprit que `demandes` (0026).
-- `series_sous_besoins` porte les lignes métier de la série (1 ligne
-- = 1 poste = 1 professionnel habituel choisi, même granularité que
-- mission_lignes/offres : 2 postes du même métier = 2 lignes
-- distinctes, jamais une colonne quantité).
--
-- Portée assumée de ce lot : chaque sous-besoin d'une série doit
-- désigner un professionnel habituel précis (repris de "Mes
-- professionnels", Bloc 6) — la variante "marché ouvert" (offres
-- récurrentes sans professionnel nommé) n'est pas construite ici,
-- honnêtement non couverte plutôt que bricolée à moitié.
--
-- Aucune table d'occurrences persistée : une fois une série
-- confirmée, chaque occurrence devient une vraie ligne du panier
-- existant (lib/panier.ts) puis une vraie `mission`/`paiement` via le
-- chemin finaliserCommande déjà en place (une mission par date
-- distincte, donc par occurrence — voir actions/commande.ts). L'état
-- de chaque occurrence (confirmée, annulée...) se lit donc directement
-- depuis `missions` filtrées par `serie_id`, jamais dupliqué dans une
-- table parallèle qui pourrait diverger.
--
-- Écriture de series_missions/series_sous_besoins via le client
-- session (RLS), comme demandes/offres — la création d'une série ne
-- déclenche aucune transaction paiement à cette étape (celle-ci a
-- lieu séparément, au moment du paiement panier existant).

create table public.series_missions (
  id uuid primary key default gen_random_uuid(),
  recruteur_id uuid not null references public.users (id) on delete cascade,
  titre text not null,
  lieu text not null,
  description text,
  frequence text not null check (frequence in ('hebdomadaire', 'toutes_les_2_semaines', 'jours_specifiques', 'mensuelle')),
  jours_semaine text[] not null default '{}',
  date_debut date not null,
  date_fin date not null,
  statut text not null default 'active' check (statut in ('active', 'annulee')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (date_fin >= date_debut)
);

create trigger series_missions_set_updated_at
  before update on public.series_missions
  for each row execute function public.set_updated_at();

create table public.series_sous_besoins (
  id uuid primary key default gen_random_uuid(),
  serie_id uuid not null references public.series_missions (id) on delete cascade,
  metier public.metier_type not null,
  prestataire_id uuid not null references public.prestataires_profils (id) on delete restrict,
  heure_debut time not null,
  heure_fin time not null,
  tarif_horaire numeric(10, 2) not null check (tarif_horaire > 0),
  created_at timestamptz not null default now(),
  check (heure_fin <> heure_debut)
);

alter table public.missions add column if not exists serie_id uuid references public.series_missions (id) on delete set null;

create index if not exists missions_serie_id_idx on public.missions (serie_id);
create index series_sous_besoins_serie_id_idx on public.series_sous_besoins (serie_id);
create index series_missions_recruteur_id_idx on public.series_missions (recruteur_id);

-- ============================================================
-- RLS — series_missions
-- ============================================================

alter table public.series_missions enable row level security;

create policy series_missions_select_own on public.series_missions for select
  using (recruteur_id = auth.uid() or public.is_admin());

create policy series_missions_insert_own on public.series_missions for insert
  with check (recruteur_id = auth.uid());

-- Seule mutation cliente permise après création : annuler la série
-- (les autres champs — période, fréquence, sous-besoins — ne sont pas
-- modifiables une fois créée dans ce lot, cf. limites du rapport de bloc).
create policy series_missions_update_own on public.series_missions for update
  using (recruteur_id = auth.uid() or public.is_admin())
  with check (recruteur_id = auth.uid() or public.is_admin());

-- Utilisée uniquement en filet de sécurité côté serveur (annulation
-- d'une création de série échouée à mi-chemin, avant toute mission
-- réelle) — aucun bouton "supprimer" dans l'interface, qui n'expose
-- que l'annulation (update statut).
create policy series_missions_delete_own on public.series_missions for delete
  using (recruteur_id = auth.uid());

-- ============================================================
-- RLS — series_sous_besoins
-- ============================================================

alter table public.series_sous_besoins enable row level security;

create policy series_sous_besoins_select_own on public.series_sous_besoins for select
  using (
    exists (
      select 1 from public.series_missions s
      where s.id = series_sous_besoins.serie_id and (s.recruteur_id = auth.uid() or public.is_admin())
    )
  );

create policy series_sous_besoins_insert_own on public.series_sous_besoins for insert
  with check (
    exists (
      select 1 from public.series_missions s
      where s.id = series_sous_besoins.serie_id and s.recruteur_id = auth.uid()
    )
  );
