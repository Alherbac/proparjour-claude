-- ProParJour — Migration 0058
-- Réconciliation générique du registre de migrations : toute migration
-- dont le nom suit la convention NNNN_ mais dont la version enregistrée
-- est un horodatage (cas des migrations appliquées via l'outil MCP)
-- est réécrite avec version = préfixe NNNN. Idempotent.
--
-- Chaque migration de ce type répare la précédente ; seule la toute
-- dernière ligne peut porter transitoirement une version horodatée
-- (réparée par la migration suivante).

do $$
declare
  r record;
  v_prefixe text;
begin
  for r in
    select version, name
    from supabase_migrations.schema_migrations
    where name ~ '^[0-9]{4}_' and version !~ '^[0-9]{4}$'
  loop
    v_prefixe := substring(r.name from '^([0-9]{4})');
    if not exists (select 1 from supabase_migrations.schema_migrations where version = v_prefixe) then
      update supabase_migrations.schema_migrations set version = v_prefixe where version = r.version;
    else
      delete from supabase_migrations.schema_migrations where version = r.version;
    end if;
  end loop;
end $$;
