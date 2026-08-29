/**
 * Contenu juridique des CGU — source unique, partagée entre la page
 * publique (/cgu) et sa vue de contrôle admin (/admin/cgu). Volontairement
 * géré dans le code (versionné par git, déployé après revue) plutôt que
 * via un éditeur en base : un texte engageant juridiquement ne devrait
 * pas pouvoir être modifié en un clic sans passer par une revue — voir
 * la note dans /admin/cgu.
 */
export const DERNIERE_MISE_A_JOUR_CGU = "août 2026";

export const ARTICLES_CGU = [
  {
    titre: "Article 1 — Objet",
    texte: `Les présentes conditions générales d'utilisation (CGU) régissent l'accès et l'usage de la plateforme ProParJour (www.proparjour.fr), éditée par Alherbac, mettant en relation des entreprises et particuliers ("Recruteurs") avec des prestataires indépendants ("Prestataires") dans trois secteurs d'activité : la sécurité privée, l'accueil et le commerce, en Île-de-France.`,
  },
  {
    titre: "Article 2 — Inscription",
    texte: `L'inscription est ouverte à toute personne majeure exerçant une activité professionnelle indépendante en France. Le Prestataire renseigne son métier, ses spécialités, sa zone d'intervention et son tarif journalier ou horaire. Le Recruteur renseigne son identité (particulier ou entreprise) et ses besoins de recrutement. L'inscription implique l'acceptation pleine et entière des présentes CGU.`,
  },
  {
    titre: "Article 3 — Vérification des profils",
    texte: `Chaque profil Prestataire fait l'objet d'un contrôle par l'équipe ProParJour avant son activation. Selon le métier exercé, ce contrôle peut inclure la vérification d'une pièce d'identité et, pour le secteur de la sécurité, de la carte professionnelle CNAPS. Un profil affiche un statut "en attente de vérification" jusqu'à validation, et n'apparaît dans les résultats de recherche des Recruteurs qu'une fois validé.`,
  },
  {
    titre: "Article 4 — Fonctionnement de la mise en relation",
    texte: `Le Recruteur consulte les profils disponibles et sélectionne un ou plusieurs Prestataires pour une mission (date, lieu, durée). Le Prestataire reste libre d'accepter ou de refuser toute mission qui lui est proposée. La confirmation d'une mission par le Prestataire vaut engagement ferme des deux parties sur les conditions affichées (tarif, date, lieu).`,
  },
  {
    titre: "Article 5 — Paiement et séquestre",
    texte: `Le règlement de la mission est effectué par carte bancaire par le Recruteur au moment de la réservation, via un prestataire de paiement sécurisé (Stripe). Les fonds sont conservés par ProParJour jusqu'à la confirmation de bonne exécution de la mission par le Recruteur. Cette confirmation déclenche la libération du paiement au Prestataire, déduction faite de la commission prévue à l'article 6. En cas d'annulation dans les délais prévus, le Recruteur est intégralement remboursé.`,
  },
  {
    titre: "Article 6 — Commission",
    texte: `L'inscription est gratuite pour les Prestataires comme pour les Recruteurs. ProParJour prélève une commission de 15% sur le montant de chaque mission réalisée, déduite du paiement versé au Prestataire. Le Recruteur ne paie aucun montant supplémentaire au tarif affiché par le Prestataire.`,
  },
  {
    titre: "Article 7 — Obligations du Prestataire",
    texte: `Le Prestataire s'engage à maintenir un profil à jour, à honorer les missions acceptées, à respecter la réglementation applicable à son activité (notamment les dispositions du Code de la sécurité intérieure pour les métiers de la sécurité privée), et à adopter un comportement conforme à l'image de la plateforme.`,
  },
  {
    titre: "Article 8 — Responsabilité",
    texte: `ProParJour agit en tant qu'intermédiaire de mise en relation et n'est pas partie au contrat de prestation conclu entre le Recruteur et le Prestataire. ProParJour ne saurait être tenu responsable de la qualité d'exécution des missions, des litiges entre utilisateurs, ou de tout dommage indirect résultant de l'usage de la plateforme. ProParJour peut proposer une médiation en cas de litige signalé, sans obligation de résultat.`,
  },
  {
    titre: "Article 9 — Données personnelles",
    texte: `Les données personnelles collectées sont traitées conformément au Règlement Général sur la Protection des Données (RGPD). Chaque utilisateur dispose d'un droit d'accès, de rectification, de suppression et de portabilité de ses données, exerçable par e-mail à contact@proparjour.fr.`,
  },
  {
    titre: "Article 10 — Modification et résiliation",
    texte: `ProParJour se réserve le droit de modifier les présentes CGU, avec notification par e-mail au moins 30 jours avant leur entrée en vigueur. La poursuite de l'utilisation de la plateforme après cette notification vaut acceptation des nouvelles conditions. Tout utilisateur peut résilier son compte à tout moment. ProParJour peut suspendre ou résilier un compte en cas de manquement grave aux présentes CGU, de fraude ou d'atteinte à la sécurité de la plateforme.`,
  },
  {
    titre: "Article 11 — Droit applicable",
    texte: `Les présentes CGU sont soumises au droit français. Tout litige fera l'objet d'une tentative de résolution amiable préalable. À défaut, les tribunaux français compétents seront seuls saisis. Conformément au Code de la consommation, un utilisateur consommateur peut recourir gratuitement à un médiateur de la consommation.`,
  },
  {
    titre: "Article 12 — Bonne foi et usage de la plateforme",
    texte: `Le Recruteur et le Prestataire s'engagent à utiliser la plateforme de bonne foi pour toute mise en relation initiée sur ProParJour, notamment en ce qui concerne le paiement et le suivi des missions via la plateforme. ProParJour se réserve le droit de suspendre tout compte dont l'usage contreviendrait manifestement à cet engagement.`,
  },
] as const;
