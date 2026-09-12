-- ProParJour — Rollback de la migration 0053 (chiffrement RIB).
-- NON APPLIQUÉ — à exécuter uniquement pour revenir en arrière.
--
-- Rétablit iban/bic en clair à partir des colonnes chiffrées, puis
-- supprime toute l'infrastructure de chiffrement. La clé Vault
-- `rib_encryption_key` est conservée par prudence (la supprimer rend
-- tout `*_chiffre` restant illisible) — décommenter la dernière ligne
-- pour l'effacer aussi.

drop trigger if exists prestataires_profils_chiffrer_rib on public.prestataires_profils;

-- Déchiffre vers les colonnes en clair.
update public.prestataires_profils
set iban = public.dechiffrer_rib(iban_chiffre),
    bic = public.dechiffrer_rib(bic_chiffre)
where iban_chiffre is not null or bic_chiffre is not null;

drop function if exists public.reveler_rib(uuid);
drop function if exists public.prestataires_profils_chiffrer_rib();
drop function if exists public.chiffrer_rib(text);
drop function if exists public.dechiffrer_rib(bytea);

alter table public.prestataires_profils
  drop column if exists iban_chiffre,
  drop column if exists bic_chiffre;

comment on column public.prestataires_profils.iban is null;
comment on column public.prestataires_profils.bic is null;

-- select vault.delete_secret((select id from vault.secrets where name = 'rib_encryption_key'));
