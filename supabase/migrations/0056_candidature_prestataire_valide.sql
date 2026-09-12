-- ProParJour — Migration 0056
-- Renfort RLS (audit prod I4) : seul un prestataire au profil VÉRIFIÉ
-- ("valide") peut insérer une candidature. Le contrôle est déjà fait
-- côté serveur (postulerOffre, src/app/actions/offres.ts) ; cette
-- policy le double au niveau base, sur le même principe que la
-- visibilité en recherche (0032).

drop policy "candidatures_insert_prestataire" on public.candidatures;
create policy "candidatures_insert_prestataire" on public.candidatures
  for insert to public
  with check (
    exists (
      select 1 from public.prestataires_profils pp
      where pp.id = candidatures.prestataire_id
        and pp.user_id = auth.uid()
        and pp.statut_verification = 'valide'
    )
  );
