-- ProParJour — Migration 0015
-- Étape 9, Lot 1 (Socle admin) : sépare les rôles d'administration
-- (admin/modérateur) du profil utilisateur éditable, dans une table
-- dédiée `user_roles`, conformément au cahier des charges du
-- tableau de bord administrateur (section 1.2, exigence non
-- négociable) — plutôt qu'un stockage sur `users.type`.
--
-- Migration à faible risque : `is_admin()` reste le seul point
-- d'entrée que les 12 policies et 2 triggers existants appellent —
-- seul son corps interne change (délègue à has_role('admin')),
-- aucune policy existante n'est touchée.
--
-- À exécuter dans l'éditeur SQL du dashboard Supabase, après 0014.

create type public.admin_role as enum ('admin', 'moderator');

create table public.user_roles (
  user_id uuid not null references public.users (id) on delete cascade,
  role public.admin_role not null,
  granted_by uuid references public.users (id),
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

alter table public.user_roles enable row level security;

-- Créée avant les policies qui l'utilisent (LANGUAGE SQL, validée
-- contre le catalogue dès sa création — même contrainte d'ordre que
-- is_admin() en 0001).
create or replace function public.has_role(check_role public.admin_role)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    auth.role() = 'service_role'
    or exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = check_role
    );
$$;

create policy "user_roles_select_own_ou_admin"
  on public.user_roles for select
  using (auth.uid() = user_id or public.has_role('admin'));

create policy "user_roles_insert_admin_only"
  on public.user_roles for insert
  with check (public.has_role('admin'));

create policy "user_roles_update_admin_only"
  on public.user_roles for update
  using (public.has_role('admin'))
  with check (public.has_role('admin'));

create policy "user_roles_delete_admin_only"
  on public.user_roles for delete
  using (public.has_role('admin'));

-- Seul changement sur is_admin() : délègue désormais à has_role().
-- Signature, comportement observable et tous les appelants (12
-- policies + 2 triggers) restent identiques.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.has_role('admin');
$$;

create index user_roles_user_id_idx on public.user_roles (user_id);
