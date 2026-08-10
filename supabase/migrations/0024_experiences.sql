-- ProParJour — Migration 0024
-- Section "Expériences" du profil prestataire (mini-CV) : contrairement
-- à `prestataires_formations` (écriture réservée à l'admin/migration),
-- le prestataire gère lui-même ses expériences depuis "Mon compte" —
-- d'où les policies INSERT/UPDATE/DELETE côté propriétaire, absentes
-- sur formations.

create table public.experiences (
  id uuid primary key default gen_random_uuid(),
  prestataire_id uuid not null references public.prestataires_profils (id) on delete cascade,
  intitule text not null,
  employeur text,
  periode text not null,
  lieu text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger experiences_set_updated_at
  before update on public.experiences
  for each row execute function public.set_updated_at();

alter table public.experiences enable row level security;

-- Même visibilité que prestataires_formations : le prestataire voit
-- toujours les siennes, l'admin/modérateur voit tout, le public voit
-- celles d'un profil validé.
create policy "experiences_select_own_admin_ou_public"
  on public.experiences for select
  using (
    exists (
      select 1 from public.prestataires_profils pp
      where pp.id = experiences.prestataire_id
        and (pp.user_id = auth.uid() or pp.statut_verification = 'valide')
    )
    or public.has_role('admin')
    or public.has_role('moderator')
  );

create policy "experiences_insert_own"
  on public.experiences for insert
  with check (
    exists (
      select 1 from public.prestataires_profils pp
      where pp.id = experiences.prestataire_id and pp.user_id = auth.uid()
    )
  );

create policy "experiences_update_own"
  on public.experiences for update
  using (
    exists (
      select 1 from public.prestataires_profils pp
      where pp.id = experiences.prestataire_id and pp.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.prestataires_profils pp
      where pp.id = experiences.prestataire_id and pp.user_id = auth.uid()
    )
  );

create policy "experiences_delete_own"
  on public.experiences for delete
  using (
    exists (
      select 1 from public.prestataires_profils pp
      where pp.id = experiences.prestataire_id and pp.user_id = auth.uid()
    )
  );

create index experiences_prestataire_id_idx on public.experiences (prestataire_id);
