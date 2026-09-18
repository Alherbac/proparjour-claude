-- ProParJour — Migration 0058
-- Désactivation TEMPORAIRE (demande produit, période de préparation
-- avant lancement) de la policy 0056 : la vérification manuelle des
-- profils par l'équipe ProParJour n'est pas encore opérationnelle,
-- donc exiger statut_verification = 'valide' bloquait toute
-- candidature avec l'erreur générique "Vous n'avez pas les droits
-- nécessaires pour cette action." (42501). Le contrôle applicatif
-- correspondant est désactivé au même moment dans postulerOffre
-- (src/app/actions/offres.ts).
--
-- Pour réactiver la règle une fois la vérification des profils
-- opérationnelle, ré-applique la policy de 0056 (même condition,
-- avec `and pp.statut_verification = 'valide'`).
drop policy "candidatures_insert_prestataire" on public.candidatures;
create policy "candidatures_insert_prestataire" on public.candidatures
  for insert to public
  with check (
    exists (
      select 1 from public.prestataires_profils pp
      where pp.id = candidatures.prestataire_id
        and pp.user_id = auth.uid()
    )
  );
