-- ProParJour — Migration 0036
-- Rate limiting minimal (catégorie B, liste du 2026-08-23, point 4).
-- Déploiement serverless (Vercel) : un compteur en mémoire applicatif
-- ne survivrait pas d'une invocation à l'autre ni ne serait partagé
-- entre instances. Plutôt que d'ajouter une dépendance externe
-- (Upstash Redis ou équivalent — un nouveau compte à créer, donc une
-- décision catégorie A), ce compteur réutilise l'infrastructure déjà
-- en place : une seule table, une fonction atomique (upsert
-- fenêtre-glissante), appelée par src/lib/rate-limit.ts sur les
-- routes sensibles (connexion, paiement).
create table if not exists public.rate_limits (
  cle text primary key,
  compteur integer not null default 1,
  fenetre_debut timestamptz not null default now()
);
alter table public.rate_limits enable row level security;
-- Aucune policy : lu/écrit exclusivement par le rôle service, jamais
-- exposé au client (comme webhook_events_traites, 0034).

create or replace function public.verifier_limite_debit(p_cle text, p_max integer, p_fenetre_secondes integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_compteur integer;
begin
  insert into public.rate_limits (cle, compteur, fenetre_debut)
  values (p_cle, 1, now())
  on conflict (cle) do update
    set
      compteur = case
        when public.rate_limits.fenetre_debut < now() - (p_fenetre_secondes || ' seconds')::interval
          then 1
        else public.rate_limits.compteur + 1
      end,
      fenetre_debut = case
        when public.rate_limits.fenetre_debut < now() - (p_fenetre_secondes || ' seconds')::interval
          then now()
        else public.rate_limits.fenetre_debut
      end
  returning compteur into v_compteur;

  return v_compteur <= p_max;
end;
$$;

grant execute on function public.verifier_limite_debit(text, integer, integer) to service_role;
