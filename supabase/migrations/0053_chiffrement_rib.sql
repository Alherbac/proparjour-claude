-- ProParJour — Migration 0053
-- Chiffrement au repos des coordonnées bancaires (audit prod I3).
--
-- Constat : `prestataires_profils.iban` / `.bic` (0029) étaient stockés
-- en clair. L'exposition anonyme via l'API REST avait déjà été fermée
-- (0032), et l'accès est restreint au propriétaire + admin/modérateur
-- (policies 0016) ; il restait le stockage en clair lui-même.
--
-- Choix : chiffrement symétrique pgcrypto (pgp_sym_encrypt), la clé
-- vivant dans Supabase Vault (hors dump SQL / hors snapshot disque).
-- Un trigger BEFORE chiffre toute valeur écrite dans `iban`/`bic` vers
-- les colonnes `*_chiffre` (bytea) et remet la colonne en clair à NULL :
-- le clair ne persiste jamais. La lecture (révélation admin) passe par
-- la fonction `reveler_rib`, réservée à service_role et journalisée
-- côté application (action `iban_consulte`).
--
-- Réversible : voir 0053_chiffrement_rib_down.sql (déchiffre vers les
-- colonnes en clair et supprime l'infrastructure). NON APPLIQUÉ.
--
-- Impact données : 1 ligne portait un IBAN au moment de la migration.

-- 1) Clé de chiffrement dans Vault (créée une seule fois).
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'rib_encryption_key') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'base64'),
      'rib_encryption_key',
      'Clé symétrique de chiffrement des IBAN/BIC prestataires (migration 0053).'
    );
  end if;
end $$;

-- 2) Colonnes chiffrées.
alter table public.prestataires_profils
  add column if not exists iban_chiffre bytea,
  add column if not exists bic_chiffre bytea;

comment on column public.prestataires_profils.iban is
  'Toujours NULL : le clair est chiffré vers iban_chiffre par le trigger prestataires_profils_chiffrer_rib (0053).';
comment on column public.prestataires_profils.bic is
  'Toujours NULL : le clair est chiffré vers bic_chiffre par le trigger prestataires_profils_chiffrer_rib (0053).';
comment on column public.prestataires_profils.iban_chiffre is
  'IBAN chiffré (pgp_sym_encrypt, clé Vault rib_encryption_key). Lecture via public.reveler_rib (service_role).';
comment on column public.prestataires_profils.bic_chiffre is
  'BIC chiffré (pgp_sym_encrypt, clé Vault rib_encryption_key). Lecture via public.reveler_rib (service_role).';

-- 3) Primitives de (dé)chiffrement — clé lue dans Vault, jamais en clair
--    dans le code ni dans les colonnes.
create or replace function public.chiffrer_rib(p_valeur text)
returns bytea
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_cle text;
begin
  if p_valeur is null or btrim(p_valeur) = '' then
    return null;
  end if;
  select decrypted_secret into v_cle from vault.decrypted_secrets where name = 'rib_encryption_key';
  if v_cle is null then
    raise exception 'Clé de chiffrement RIB (rib_encryption_key) absente du Vault';
  end if;
  return extensions.pgp_sym_encrypt(p_valeur, v_cle);
end;
$$;

create or replace function public.dechiffrer_rib(p_chiffre bytea)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_cle text;
begin
  if p_chiffre is null then
    return null;
  end if;
  select decrypted_secret into v_cle from vault.decrypted_secrets where name = 'rib_encryption_key';
  if v_cle is null then
    raise exception 'Clé de chiffrement RIB (rib_encryption_key) absente du Vault';
  end if;
  return extensions.pgp_sym_decrypt(p_chiffre, v_cle);
end;
$$;

revoke execute on function public.chiffrer_rib(text) from public;
revoke execute on function public.dechiffrer_rib(bytea) from public;
grant execute on function public.chiffrer_rib(text) to service_role;
grant execute on function public.dechiffrer_rib(bytea) to service_role;

-- 4) Trigger : chiffre à l'écriture, ne laisse jamais de clair en base.
create or replace function public.prestataires_profils_chiffrer_rib()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  -- N'agit que sur une écriture de clair. Un `iban = null` explicite
  -- (effacement) n'efface pas iban_chiffre — l'effacement du RIB n'est
  -- pas un parcours actuel ; le backfill 0053, lui, écrit directement
  -- iban_chiffre et met iban à NULL, ce que cette garde laisse passer.
  if new.iban is not null then
    new.iban_chiffre := public.chiffrer_rib(new.iban);
    new.iban := null;
  end if;
  if new.bic is not null then
    new.bic_chiffre := public.chiffrer_rib(new.bic);
    new.bic := null;
  end if;
  return new;
end;
$$;

drop trigger if exists prestataires_profils_chiffrer_rib on public.prestataires_profils;
create trigger prestataires_profils_chiffrer_rib
  before insert or update of iban, bic on public.prestataires_profils
  for each row execute function public.prestataires_profils_chiffrer_rib();

-- 5) Révélation admin (service_role uniquement).
create or replace function public.reveler_rib(p_profil_id uuid)
returns table(iban text, bic text)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  return query
  select public.dechiffrer_rib(p.iban_chiffre), public.dechiffrer_rib(p.bic_chiffre)
  from public.prestataires_profils p
  where p.id = p_profil_id;
end;
$$;

revoke execute on function public.reveler_rib(uuid) from public;
grant execute on function public.reveler_rib(uuid) to service_role;

-- 6) Backfill explicite des lignes déjà porteuses d'un RIB en clair :
--    chiffre vers les colonnes bytea puis remet le clair à NULL.
update public.prestataires_profils
set iban_chiffre = public.chiffrer_rib(iban),
    bic_chiffre = public.chiffrer_rib(bic),
    iban = null,
    bic = null
where iban is not null or bic is not null;
