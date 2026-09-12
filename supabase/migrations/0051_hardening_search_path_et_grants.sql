-- ProParJour — Migration 0051 (durcissement — audit prod A5 + advisor Supabase)
--
-- 1) search_path immuable sur les fonctions qui ne l'avaient pas
--    (advisor `function_search_path_mutable`). `ALTER FUNCTION ... SET
--    search_path` ne touche NI au corps NI à la logique métier —
--    seulement le paramètre de session, pour empêcher un détournement
--    via un search_path manipulé.
alter function public.set_updated_at() set search_path = public;
alter function public.creer_mission_payee(uuid, text, date, jsonb, numeric, numeric, numeric, text, text) set search_path = public;
alter function public.creer_mission_depuis_candidature(uuid, uuid, uuid, uuid, metier_type, text, date, time without time zone, time without time zone, numeric, numeric, numeric, numeric, text) set search_path = public;
alter function public.creer_mission_proposee(uuid, text, date, jsonb, numeric, numeric, numeric, text) set search_path = public;
alter function public.confirmer_paiement_mission(uuid, text, numeric) set search_path = public;

-- 2) Fonctions internes exposées par erreur via /rest/v1/rpc à anon /
--    authenticated. Elles ne sont invoquées QUE côté serveur avec la
--    clé service_role (lib/rate-limit.ts) ou par un job de maintenance.
--    `verifier_limite_debit` exposé permettait à un tiers de verrouiller
--    la connexion d'autrui en épuisant sa clé de rate-limit.
--    NB : le vrai retrait se fait dans 0052 (REVOKE FROM PUBLIC).
revoke execute on function public.verifier_limite_debit(text, integer, integer) from anon, authenticated;
revoke execute on function public.purger_vieilles_visites() from anon, authenticated;
