-- ProParJour — Migration 0050
--
-- Normalisation du journal de migrations (audit prod C2). Jusqu'ici les
-- migrations 0001->0049 étaient collées à la main dans l'éditeur SQL du
-- dashboard, sans aucune traçabilité : la table
-- `supabase_migrations.schema_migrations` n'existait pas avant l'audit.
--
-- Cette migration enregistre l'ensemble des migrations du dépôt
-- (`supabase/migrations/`) par leur préfixe numérique — qui est l'ordre
-- canonique du projet — pour un journal complet et 1:1 avec le repo.
-- Les 3 lignes horodatées créées par `apply_migration` pour
-- 0037/0038/0039 sont remplacées par leur préfixe.
--
-- À partir de maintenant : toute nouvelle migration s'applique via
-- l'éditeur SQL Supabase OU l'outil `apply_migration`, ET s'enregistre
-- dans `schema_migrations` (colonne `version` = préfixe du fichier).
-- Voir supabase/migrations/README.md.

delete from supabase_migrations.schema_migrations
where name in ('0037_avis', '0038_demandes_suppression', '0039_parametres_commission')
  and version ~ '^\d{14}$';

insert into supabase_migrations.schema_migrations (version, name, statements) values
  ('0001', '0001_init', array['-- appliquée manuellement avant la mise en place du suivi']),
  ('0002', '0002_specialites', array['-- appliquée manuellement avant la mise en place du suivi']),
  ('0003', '0003_prestataires_publics', array['-- appliquée manuellement avant la mise en place du suivi']),
  ('0004', '0004_prestataires_publics_fix_exposure', array['-- appliquée manuellement avant la mise en place du suivi']),
  ('0005', '0005_recherche_indexes', array['-- appliquée manuellement avant la mise en place du suivi']),
  ('0006', '0006_prestataires_publics_add_created_at', array['-- appliquée manuellement avant la mise en place du suivi']),
  ('0007', '0007_missions', array['-- appliquée manuellement avant la mise en place du suivi']),
  ('0008', '0008_fix_missions_rls_recursion', array['-- appliquée manuellement avant la mise en place du suivi']),
  ('0009', '0009_service_fait', array['-- appliquée manuellement avant la mise en place du suivi']),
  ('0010', '0010_messages', array['-- appliquée manuellement avant la mise en place du suivi']),
  ('0011', '0011_notifications', array['-- appliquée manuellement avant la mise en place du suivi']),
  ('0012', '0012_notifications_mission_id', array['-- appliquée manuellement avant la mise en place du suivi']),
  ('0013', '0013_messages_systeme', array['-- appliquée manuellement avant la mise en place du suivi']),
  ('0014', '0014_prestataires_visibilite', array['-- appliquée manuellement avant la mise en place du suivi']),
  ('0015', '0015_user_roles', array['-- appliquée manuellement avant la mise en place du suivi']),
  ('0016', '0016_justificatifs_kyc', array['-- appliquée manuellement avant la mise en place du suivi']),
  ('0017', '0017_migration_lovable_prep', array['-- appliquée manuellement avant la mise en place du suivi']),
  ('0018', '0018_compteur_public_missions', array['-- appliquée manuellement avant la mise en place du suivi']),
  ('0019', '0019_titre_professionnel', array['-- appliquée manuellement avant la mise en place du suivi']),
  ('0020', '0020_disponibilites_calendrier', array['-- appliquée manuellement avant la mise en place du suivi']),
  ('0021', '0021_badge_en_mission', array['-- appliquée manuellement avant la mise en place du suivi']),
  ('0022', '0022_description_mission', array['-- appliquée manuellement avant la mise en place du suivi']),
  ('0023', '0023_offres_candidatures', array['-- appliquée manuellement avant la mise en place du suivi']),
  ('0024', '0024_experiences', array['-- appliquée manuellement avant la mise en place du suivi']),
  ('0025', '0025_audit_log_missions_admin', array['-- appliquée manuellement avant la mise en place du suivi']),
  ('0026', '0026_demandes_globales', array['-- appliquée manuellement avant la mise en place du suivi']),
  ('0027', '0027_matching_rpcs', array['-- appliquée manuellement avant la mise en place du suivi']),
  ('0028', '0028_series_recurrentes', array['-- appliquée manuellement avant la mise en place du suivi']),
  ('0029', '0029_rib', array['-- appliquée manuellement avant la mise en place du suivi']),
  ('0030', '0030_offres_suppression', array['-- appliquée manuellement avant la mise en place du suivi']),
  ('0031', '0031_candidature_vers_mission', array['-- appliquée manuellement avant la mise en place du suivi']),
  ('0032', '0032_fix_exposition_prestataires_profils', array['-- appliquée manuellement avant la mise en place du suivi']),
  ('0034', '0034_webhook_stripe', array['-- appliquée manuellement avant la mise en place du suivi']),
  ('0035', '0035_versements_prestataires', array['-- appliquée manuellement avant la mise en place du suivi']),
  ('0036', '0036_rate_limiting', array['-- appliquée manuellement avant la mise en place du suivi']),
  ('0037', '0037_avis', array['-- appliquée via apply_migration (audit prod C1)']),
  ('0038', '0038_demandes_suppression', array['-- appliquée via apply_migration (audit prod C1)']),
  ('0039', '0039_parametres_commission', array['-- appliquée via apply_migration (audit prod C1)']),
  ('0040', '0040_mission_proposee', array['-- appliquée manuellement avant la mise en place du suivi']),
  ('0041', '0041_refus_auto_et_serie_fiable', array['-- appliquée manuellement avant la mise en place du suivi']),
  ('0042', '0042_informations_mission', array['-- appliquée manuellement avant la mise en place du suivi']),
  ('0043', '0043_candidature_en_discussion', array['-- appliquée manuellement avant la mise en place du suivi']),
  ('0044', '0044_villes_admin', array['-- appliquée manuellement avant la mise en place du suivi']),
  ('0045', '0045_commissions_hierarchie', array['-- appliquée manuellement avant la mise en place du suivi']),
  ('0046', '0046_visites', array['-- appliquée manuellement avant la mise en place du suivi']),
  ('0047', '0047_candidature_profil_consulte', array['-- appliquée manuellement avant la mise en place du suivi']),
  ('0048', '0048_experience_zones_deplacement', array['-- appliquée manuellement avant la mise en place du suivi']),
  ('0049', '0049_prestataires_vitrine', array['-- appliquée manuellement avant la mise en place du suivi'])
on conflict (version) do nothing;
