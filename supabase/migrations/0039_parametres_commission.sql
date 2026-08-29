-- ProParJour — Migration 0039
-- Catégorie B, point 11 (Lot 4, module "Commissions") : le taux de
-- commission était jusqu'ici une constante figée dans le code
-- (TAUX_COMMISSION_DEFAUT = 15, src/lib/stripe/server.ts) —
-- impossible à ajuster sans déploiement, alors que le cahier des
-- charges §3.10 demande explicitement une "configuration du taux de
-- commission" depuis le back-office.
--
-- Table singleton (une seule ligne, `id` contraint à `true`) plutôt
-- qu'un taux par métier : les missions multi-prestataires de ce
-- projet ont UN SEUL `paiements.taux_commission` par mission (0007),
-- pas un taux par ligne — un taux par métier n'aurait pas de sens
-- clair sur un panier mêlant plusieurs métiers. Le cahier des charges
-- autorise explicitement "global et/ou par métier" ; le choix ici est
-- de livrer le global maintenant plutôt que de complexifier le schéma
-- pour un cas (panier mono-métier) qui reste minoritaire.
--
-- getTauxCommission() (lib/commission.ts) lit cette table avec repli
-- sur TAUX_COMMISSION_DEFAUT si la ligne n'existe pas encore —
-- fonctionne dès l'exécution de cette migration, sans dépendre d'un
-- ordre d'exécution avec le seed initial.
--
-- À exécuter dans l'éditeur SQL du dashboard Supabase, après 0038.

create table public.parametres_commission (
  id boolean primary key default true,
  taux numeric(5, 2) not null default 15 check (taux >= 0 and taux <= 100),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users (id),
  constraint parametres_commission_singleton check (id = true)
);

insert into public.parametres_commission (id, taux) values (true, 15);

alter table public.parametres_commission enable row level security;

create policy "parametres_commission_select_admin_ou_moderateur"
  on public.parametres_commission for select
  using (public.has_role('admin') or public.has_role('moderator'));

-- Pas de policy INSERT/UPDATE cliente : modification réservée à
-- l'admin (role = 'admin', vérifié en Server Action), via client
-- admin — même principe que le reste du back-office.
