-- ProParJour — Migration 0003
-- La fiche profil publique (/prestataires/[id]) doit pouvoir afficher
-- le prénom/nom du prestataire, mais la table `users` n'a volontairement
-- aucune policy de lecture publique (elle contient aussi le téléphone,
-- la ville privée, etc.). On expose donc une vue étroite, limitée aux
-- colonnes publiques et aux profils validés — pas d'accès direct élargi
-- à `users`.
--
-- Les vues Postgres s'exécutent par défaut avec les droits de leur
-- propriétaire (ici le rôle d'exécution de la migration), ce qui leur
-- permet de traverser la RLS de `users` : c'est voulu ici, la vue
-- elle-même est le périmètre de sécurité (seuls prenom/nom sont
-- sélectionnés, jamais telephone/ville de `users`).
--
-- À exécuter dans l'éditeur SQL du dashboard Supabase, après 0002.

create view public.prestataires_publics as
select
  pp.id,
  pp.user_id,
  pp.metier,
  pp.numero_carte_cnaps,
  pp.certifications,
  pp.langues,
  pp.bio,
  pp.ville,
  pp.tarif_type,
  pp.tarif_montant,
  pp.disponibilites,
  pp.photo_url,
  pp.specialites,
  pp.statut_verification,
  u.prenom,
  u.nom
from public.prestataires_profils pp
join public.users u on u.id = pp.user_id
where pp.statut_verification = 'valide';

grant select on public.prestataires_publics to anon, authenticated;
