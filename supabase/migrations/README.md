# Migrations Supabase — ProParJour

## Suivi des migrations (mis en place suite à l'audit prod, C2)

L'historique (0001→0049) a été appliqué **manuellement** dans l'éditeur SQL
du dashboard Supabase, sans traçabilité. La migration `0050` a rétabli un
journal fiable dans la table `supabase_migrations.schema_migrations`.

**État vérifié le 2026-09-10 :** toutes les migrations `0001`→`0059` sont
appliquées en production (diff schéma complet effectué — colonnes, enums,
vues, fonctions, policies, triggers, index). Il n'existe pas de migration
`0033` (saut de numérotation historique).

### Lot audit prod (0050→0059)

| #    | Objet |
|------|-------|
| 0050 | Backfill du journal 0001→0049 (C2). |
| 0051 | `SET search_path = public` sur les fonctions sensibles (A5) + revoke rate-limit. |
| 0052 | Revoke `EXECUTE ... FROM public` (correctif 0051). |
| 0053 | Chiffrement au repos des IBAN/BIC (I3) — pgcrypto + clé Vault, trigger + `reveler_rib`. Rollback : `0053_chiffrement_rib_down.sql` (non appliqué). |
| 0054 | Revoke `reveler_rib` / `dechiffrer_rib` / `chiffrer_rib` de `anon` + `authenticated` (correctif 0053). |
| 0055 | Normalisation du journal 0050→0054 (versions horodatées → `NNNN`). |
| 0056 | Renfort RLS : seul un prestataire `valide` peut insérer une candidature (I4). |
| 0057 | Bucket `avatars` : `file_size_limit` 6 Mio + `allowed_mime_types` image (I7). |
| 0058 / 0059 | Normaliseur générique du journal (idempotent). |

**Journal auto-réparateur :** chaque migration `0058`/`0059` (même corps) réécrit
la `version` horodatée d'une migration `NNNN_` vers son préfixe. Seule la
**toute dernière** ligne insérée par `apply_migration` peut porter
transitoirement un horodatage — la migration suivante la corrige.

## Convention

- Fichier : `<NNNN>_<nom_court>.sql`, préfixe numérique = **ordre canonique**.
- La colonne `version` de `schema_migrations` = ce préfixe (`'0037'`, etc.).

## Appliquer une nouvelle migration

1. Écrire `supabase/migrations/<NNNN>_<nom>.sql`.
2. L'exécuter :
   - soit via l'éditeur SQL du dashboard Supabase,
   - soit via l'outil `apply_migration` (MCP Supabase).
3. **Enregistrer la migration** dans le journal (si l'éditeur SQL est utilisé,
   `apply_migration` le fait automatiquement) :

   ```sql
   insert into supabase_migrations.schema_migrations (version, name, statements)
   values ('<NNNN>', '<NNNN>_<nom>', array['-- voir supabase/migrations/<NNNN>_<nom>.sql']);
   ```

4. Vérifier :

   ```sql
   select version, name from supabase_migrations.schema_migrations order by version;
   ```

## Règles

- **Jamais** de `DROP TABLE` / `DROP COLUMN` pour « synchroniser ».
- Migrations **additives** de préférence ; toute opération destructive doit
  être réversible et validée avant exécution.
- `execute_sql` (MCP) tourne en transaction **read-only** — seul
  `apply_migration` (ou l'éditeur SQL) peut écrire.
