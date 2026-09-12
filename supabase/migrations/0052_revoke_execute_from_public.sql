-- ProParJour — Migration 0052 (correctif de 0051)
--
-- `REVOKE ... FROM anon, authenticated` ne retire pas le GRANT
-- implicite à PUBLIC dont ces rôles héritent. Il faut
-- `REVOKE ... FROM PUBLIC` (même pattern que 0032 pour has_role /
-- is_admin), puis re-grant explicite au strict nécessaire.
--
-- Ces fonctions ne sont invoquées QUE côté serveur avec la clé
-- service_role, jamais depuis un client anon/authenticated. Les
-- triggers qui utilisent set_updated_at continuent de fonctionner :
-- l'exécution d'un trigger ne dépend pas du privilège EXECUTE de
-- l'appelant.

revoke execute on function public.verifier_limite_debit(text, integer, integer) from public;
revoke execute on function public.purger_vieilles_visites() from public;
revoke execute on function public.set_updated_at() from public;

grant execute on function public.verifier_limite_debit(text, integer, integer) to service_role;
grant execute on function public.purger_vieilles_visites() to service_role;
