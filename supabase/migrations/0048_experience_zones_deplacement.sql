-- Deux nouveaux champs facultatifs introduits par la refonte de
-- l'inscription prestataire en trois temps :
--
-- annees_experience (temps 2 "Ce que vous faites") — affiché sur la
-- fiche publique aux côtés de la ville.
--
-- zones_deplacement (temps 3 "Où et quand", "Vous vous déplacez
-- aussi") — zones facultatives au-delà de la ville principale
-- (Petite couronne, Grande couronne, Toute la région, Déplacements
-- nationaux), même format texte libre que `specialites`/`langues`
-- plutôt qu'un enum : la liste de zones proposée peut évoluer sans
-- nouvelle migration.
--
-- Les deux sont nullable/vides par défaut : aucune donnée existante à
-- backfiller, rien ne les renseignait avant cette refonte.
alter table public.prestataires_profils
  add column if not exists annees_experience integer check (annees_experience >= 0),
  add column if not exists zones_deplacement text[] not null default '{}';
