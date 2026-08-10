-- ProParJour — Migration 0016
-- Étape 9, Lot 2 (Conformité) : upload réel des justificatifs KYC,
-- table dédiée par document (au lieu d'un statut unique sur
-- prestataires_profils), et élargissement de la validation aux
-- modérateurs — conformément au cahier des charges §1.2 ("Modérateur :
-- Validation documentaire... Pas d'accès finances ni paramètres").
--
-- À exécuter dans l'éditeur SQL du dashboard Supabase, après 0015.

-- ============================================================
-- 1. Élargit prestataires_profils (SELECT/UPDATE) aux modérateurs
-- ============================================================

drop policy "prestataires_profils_select_own_or_admin" on public.prestataires_profils;
create policy "prestataires_profils_select_own_ou_admin_moderateur"
  on public.prestataires_profils for select
  using (
    auth.uid() = user_id
    or public.has_role('admin')
    or public.has_role('moderator')
  );

drop policy "prestataires_profils_update_own_or_admin" on public.prestataires_profils;
create policy "prestataires_profils_update_own_ou_admin_moderateur"
  on public.prestataires_profils for update
  using (
    auth.uid() = user_id
    or public.has_role('admin')
    or public.has_role('moderator')
  )
  with check (
    auth.uid() = user_id
    or public.has_role('admin')
    or public.has_role('moderator')
  );

-- Le trigger protégeait déjà statut_verification contre un
-- prestataire qui se validerait lui-même ; il protège maintenant
-- aussi motif_refus (oubli identifié à l'audit), et reconnaît les
-- modérateurs en plus des admins.
create or replace function public.prevent_self_verification_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.has_role('admin') or public.has_role('moderator')) then
    if new.statut_verification is distinct from old.statut_verification then
      raise exception 'Seul un administrateur ou modérateur peut modifier le statut de vérification.';
    end if;
    if new.motif_refus is distinct from old.motif_refus then
      raise exception 'Seul un administrateur ou modérateur peut modifier le motif de refus.';
    end if;
  end if;
  return new;
end;
$$;

-- ============================================================
-- 2. Table justificatifs — un document = une ligne, checklist
--    dynamique par métier gérée côté application (pas en base)
-- ============================================================

create table public.justificatifs (
  id uuid primary key default gen_random_uuid(),
  prestataire_id uuid not null references public.prestataires_profils (id) on delete cascade,
  type_document text not null,
  storage_path text not null,
  statut public.statut_verification_type not null default 'en_attente',
  motif_refus text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.users (id)
);

alter table public.justificatifs enable row level security;

create policy "justificatifs_select_own_ou_admin_moderateur"
  on public.justificatifs for select
  using (
    exists (
      select 1 from public.prestataires_profils pp
      where pp.id = justificatifs.prestataire_id and pp.user_id = auth.uid()
    )
    or public.has_role('admin')
    or public.has_role('moderator')
  );

create policy "justificatifs_insert_own"
  on public.justificatifs for insert
  with check (
    exists (
      select 1 from public.prestataires_profils pp
      where pp.id = justificatifs.prestataire_id and pp.user_id = auth.uid()
    )
  );

create policy "justificatifs_update_admin_moderateur"
  on public.justificatifs for update
  using (public.has_role('admin') or public.has_role('moderator'))
  with check (public.has_role('admin') or public.has_role('moderator'));

create index justificatifs_prestataire_id_idx on public.justificatifs (prestataire_id);

-- ============================================================
-- 3. Bucket Storage privé — aucun accès public, lecture uniquement
--    via URL signée à durée limitée générée côté serveur
-- ============================================================

insert into storage.buckets (id, name, public)
values ('justificatifs', 'justificatifs', false)
on conflict (id) do nothing;

create policy "justificatifs_storage_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'justificatifs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "justificatifs_storage_select_own_ou_admin_moderateur"
  on storage.objects for select
  using (
    bucket_id = 'justificatifs'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.has_role('admin')
      or public.has_role('moderator')
    )
  );
