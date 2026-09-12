-- ProParJour — Migration 0055
-- Normalise le registre de migrations : les migrations 0050→0054,
-- appliquées via l'outil MCP, avaient été enregistrées avec des
-- versions horodatées. La convention du dépôt (voir
-- supabase/migrations/README.md) est version = préfixe NNNN. On
-- réaligne, et on retire les deux entrées temporaires de vérification
-- (tmp_verif_rib_0053*) qui n'ont pas de fichier de migration.

delete from supabase_migrations.schema_migrations
where name in (
  '0050_backfill_migration_ledger',
  '0051_hardening_search_path_et_grants',
  '0052_revoke_execute_from_public',
  '0053_chiffrement_rib',
  '0054_rib_revoke_anon_authenticated',
  'tmp_verif_rib_0053',
  'tmp_verif_rib_0053_cleanup'
);

insert into supabase_migrations.schema_migrations (version, name) values
  ('0050', '0050_backfill_migration_ledger'),
  ('0051', '0051_hardening_search_path_et_grants'),
  ('0052', '0052_revoke_execute_from_public'),
  ('0053', '0053_chiffrement_rib'),
  ('0054', '0054_rib_revoke_anon_authenticated')
on conflict (version) do nothing;
