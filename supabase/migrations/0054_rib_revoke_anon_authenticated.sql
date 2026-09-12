-- ProParJour — Migration 0054 (correctif de 0053).
--
-- Supabase applique des DEFAULT PRIVILEGES qui accordent EXECUTE aux
-- rôles `anon` et `authenticated` sur toute nouvelle fonction de
-- `public` : le `revoke ... from public` de 0053 ne les retire pas
-- (ce sont des grants nominatifs, pas le grant PUBLIC). Sans ce
-- correctif, `reveler_rib` / `dechiffrer_rib` resteraient appelables
-- anonymement via `/rest/v1/rpc/…`, ce qui annulerait tout l'intérêt
-- du chiffrement au repos (audit prod I3).
--
-- Vérifié après application : has_function_privilege('anon', …) =
-- false pour les quatre fonctions ; 'service_role' conserve l'accès.

revoke execute on function public.chiffrer_rib(text) from anon, authenticated, public;
revoke execute on function public.dechiffrer_rib(bytea) from anon, authenticated, public;
revoke execute on function public.reveler_rib(uuid) from anon, authenticated, public;
revoke execute on function public.prestataires_profils_chiffrer_rib() from anon, authenticated, public;

grant execute on function public.chiffrer_rib(text) to service_role;
grant execute on function public.dechiffrer_rib(bytea) to service_role;
grant execute on function public.reveler_rib(uuid) to service_role;
