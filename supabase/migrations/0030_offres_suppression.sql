-- ProParJour — Migration 0030
-- 0023 n'avait pas de policy DELETE sur offres (suppression non prévue
-- à l'époque, seule la clôture via "annulee" existait). Le nouveau
-- parcours recruteur ("clôturer OU supprimer une offre, sauf si une
-- candidature a été acceptée") a besoin de la suppression — la garde
-- "aucune candidature acceptée" est appliquée directement dans la
-- policy plutôt que dans la Server Action seule, pour qu'elle tienne
-- même en cas de bug applicatif.
--
-- À exécuter dans l'éditeur SQL du dashboard Supabase, après 0029.

create policy "offres_delete_proprietaire_ou_admin"
  on public.offres for delete
  using (
    (
      auth.uid() = recruteur_id
      and not exists (
        select 1 from public.candidatures c
        where c.offre_id = offres.id and c.statut = 'acceptee'
      )
    )
    or public.is_admin()
  );
