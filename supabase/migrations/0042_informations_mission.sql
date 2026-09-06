-- Dossier design, écran "Détail mission" — carte "Informations
-- manquantes" (adresse exacte et modalités d'accès, contact sur place
-- le jour de la mission, tenue ou consignes particulières). Aucun de
-- ces trois champs n'existait en base ; cette migration les ajoute,
-- nullable, sans réinterpréter aucune donnée existante — une mission
-- déjà créée les a simplement à NULL ("à compléter"), jamais une
-- valeur inventée.
alter table public.missions
  add column if not exists modalites_acces text,
  add column if not exists contact_sur_place text,
  add column if not exists consignes_particulieres text;
