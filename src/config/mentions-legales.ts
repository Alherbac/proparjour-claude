/**
 * Contenu des mentions légales — source unique, gérée dans le code
 * (versionnée par git, déployée après revue) au même titre que les CGU
 * (voir src/config/cgu.ts) et la politique de confidentialité
 * (src/config/confidentialite.ts).
 *
 * ┌───────────────────────────────────────────────────────────────────┐
 * │ CE DOCUMENT N'A PAS FAIT L'OBJET D'UNE VALIDATION JURIDIQUE.        │
 * │ Il est PRÉPARÉ à partir des seules informations réellement         │
 * │ présentes dans le code / la configuration du projet.               │
 * └───────────────────────────────────────────────────────────────────┘
 *
 * Conventions :
 *  - `[À FOURNIR/VALIDER PAR LE RESPONSABLE LÉGAL : …]` = information
 *    absente du projet, à renseigner avant toute ouverture publique.
 *  - `(à confirmer)` = information déduite du code, à faire valider.
 *
 * NE PAS inventer : SIRET, RCS, adresse, forme juridique, nom du
 * dirigeant, coordonnées de l'hébergeur.
 */
export const DERNIERE_MISE_A_JOUR_MENTIONS = "septembre 2026";

/** true tant que la page contient des espaces réservés / n'a pas été
 *  validée juridiquement — pilote le bandeau d'avertissement. */
export const MENTIONS_LEGALES_A_COMPLETER = true;

export const SECTIONS_MENTIONS_LEGALES = [
  {
    titre: "Éditeur du site",
    texte: `Le site ProParJour (www.proparjour.fr) est édité par « Alherbac » (dénomination reprise des conditions générales d'utilisation en vigueur).

Informations à compléter par le responsable légal :
Raison / dénomination sociale exacte : [À FOURNIR/VALIDER PAR LE RESPONSABLE LÉGAL]
Forme juridique : [À FOURNIR/VALIDER PAR LE RESPONSABLE LÉGAL : entreprise individuelle, SAS, SASU, SARL…]
Capital social (si société) : [À FOURNIR/VALIDER PAR LE RESPONSABLE LÉGAL]
Siège social / adresse : [À FOURNIR/VALIDER PAR LE RESPONSABLE LÉGAL]
SIREN / SIRET : [À FOURNIR/VALIDER PAR LE RESPONSABLE LÉGAL]
RCS (ville et numéro) ou RM : [À FOURNIR/VALIDER PAR LE RESPONSABLE LÉGAL]
Numéro de TVA intracommunautaire : [À FOURNIR/VALIDER PAR LE RESPONSABLE LÉGAL — la facture générée par la plateforme mentionne aujourd'hui « TVA non applicable, art. 293 B du CGI », à ajuster selon le statut fiscal réel]

Adresse e-mail de contact : contact@proparjour.fr
Téléphone : [À FOURNIR/VALIDER PAR LE RESPONSABLE LÉGAL — le numéro affiché sur la page Contact est aujourd'hui un exemple à remplacer]`,
  },
  {
    titre: "Directeur de la publication",
    texte: `[À FOURNIR/VALIDER PAR LE RESPONSABLE LÉGAL : nom et prénom du directeur de la publication — en principe le représentant légal de l'éditeur. Aucune information nominative fiable n'est présente dans le projet.]`,
  },
  {
    titre: "Hébergement",
    texte: `L'application et les données sont hébergées par les prestataires techniques suivants, identifiés d'après la configuration du projet (à confirmer par le responsable légal au regard des contrats en vigueur) :

• Hébergement de l'application web : Vercel Inc.
  Adresse publiée par le prestataire (à vérifier) : 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis.
  Téléphone : [À FOURNIR/VALIDER PAR LE RESPONSABLE LÉGAL]

• Base de données, authentification et stockage des fichiers : Supabase, Inc.
  Adresse publiée par le prestataire (à vérifier) : 970 Toa Payoh North #07-04, Singapour 318992.
  Le projet Supabase est configuré pour une région de traitement dans l'Union européenne (à confirmer).
  Téléphone : [À FOURNIR/VALIDER PAR LE RESPONSABLE LÉGAL]

[À FOURNIR/VALIDER PAR LE RESPONSABLE LÉGAL : confirmer l'hébergeur retenu, son entité contractante exacte, son adresse et son téléphone au jour de la mise en ligne.]`,
  },
  {
    titre: "Prestataires techniques tiers",
    texte: `Outre l'hébergement, le site s'appuie sur :
— Stripe (traitement des paiements par carte bancaire) ;
— Resend (envoi des e-mails transactionnels) ;
— les API publiques de l'État français « Base Adresse Nationale » (api-adresse.data.gouv.fr) et « API Géo » (geo.api.gouv.fr) pour l'auto-complétion des adresses et des villes.

Le détail des traitements de données personnelles associés figure dans la Politique de confidentialité.`,
  },
  {
    titre: "Propriété intellectuelle",
    texte: `Sauf mention contraire, l'ensemble des éléments du site ProParJour (structure, textes, interface, éléments graphiques, logo, marque « ProParJour ») est protégé par le droit de la propriété intellectuelle. Toute reproduction ou représentation, totale ou partielle, sans autorisation écrite préalable de l'éditeur, est interdite.

[À FOURNIR/VALIDER PAR LE RESPONSABLE LÉGAL : préciser si la marque « ProParJour » fait l'objet d'un dépôt INPI.]`,
  },
  {
    titre: "Responsabilité",
    texte: `ProParJour est une plateforme de mise en relation. L'éditeur n'est pas partie aux contrats de prestation conclus entre recruteurs et prestataires et met tout en œuvre pour assurer l'exactitude des informations diffusées, sans garantie d'exhaustivité ni d'absence d'erreur. Les conditions d'utilisation du service sont détaillées dans les CGU.`,
  },
  {
    titre: "Données personnelles et cookies",
    texte: `Les traitements de données personnelles réalisés via le site, les durées de conservation, les sous-traitants et les modalités d'exercice des droits sont décrits dans la Politique de confidentialité : /confidentialite.

La gestion des cookies et traceurs est accessible depuis le bandeau de consentement affiché à la première visite.`,
  },
  {
    titre: "Contact",
    texte: `Pour toute question relative aux présentes mentions légales : contact@proparjour.fr.`,
  },
] as const;
