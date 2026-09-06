-- Nouveau contrôle du parcours "Candidatures reçues" (voir §1 du
-- chantier "CANDIDATURES REÇUES — WORKFLOW OBLIGATOIRE") : "Retenir"
-- une candidature (ouvrir la conversation) ne doit être possible
-- qu'après que le recruteur a consulté la fiche privée du candidat
-- (/client/candidats/[id], voir marquerProfilConsulte,
-- app/client/actions.ts). Horodatage plutôt qu'un simple booléen —
-- cohérent avec le reste du schéma (created_at, updated_at) et permet
-- un futur diagnostic ("consulté il y a X jours") sans migration
-- supplémentaire.
alter table public.candidatures
  add column if not exists profil_consulte_le timestamptz;
