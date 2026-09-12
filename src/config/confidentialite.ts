/**
 * Contenu de la Politique de confidentialité — source unique, gérée
 * dans le code (versionnée par git, déployée après revue) au même titre
 * que les CGU (src/config/cgu.ts) et les mentions légales
 * (src/config/mentions-legales.ts).
 *
 * ┌───────────────────────────────────────────────────────────────────┐
 * │ CE DOCUMENT N'A PAS FAIT L'OBJET D'UNE VALIDATION JURIDIQUE.        │
 * │ Il décrit le fonctionnement RÉEL de la plateforme tel qu'observé   │
 * │ dans le code ; les qualifications juridiques (bases légales,       │
 * │ durées, mécanismes de transfert) restent à faire valider.         │
 * └───────────────────────────────────────────────────────────────────┘
 *
 * Conventions :
 *  - `[À FOURNIR/VALIDER PAR LE RESPONSABLE LÉGAL : …]` = information
 *    absente du projet ou relevant d'un choix juridique.
 *  - `(à confirmer)` = élément déduit du code, à faire valider.
 *
 * NE PAS inventer : identité du responsable de traitement, DPO, durées
 * de conservation non connues, bases légales incertaines, mécanismes
 * de transfert hors UE.
 */
export const DERNIERE_MISE_A_JOUR_CONFIDENTIALITE = "septembre 2026";

/** true tant que la page contient des espaces réservés / n'a pas été
 *  validée juridiquement — pilote le bandeau d'avertissement. */
export const CONFIDENTIALITE_A_COMPLETER = true;

export const SECTIONS_CONFIDENTIALITE = [
  {
    titre: "1. Responsable du traitement",
    texte: `Le responsable du traitement des données personnelles collectées via le site ProParJour (www.proparjour.fr) est l'éditeur du site, « Alherbac » (voir mentions légales).

[À FOURNIR/VALIDER PAR LE RESPONSABLE LÉGAL : raison sociale exacte, forme juridique, siège social, SIREN/SIRET.]

Contact : contact@proparjour.fr`,
  },
  {
    titre: "2. Délégué à la protection des données (DPO)",
    texte: `[À FOURNIR/VALIDER PAR LE RESPONSABLE LÉGAL : indiquer si un DPO a été désigné. Si oui : identité / fonction et adresse de contact dédiée (par ex. dpo@proparjour.fr). Si non : indiquer le point de contact pour les questions relatives aux données personnelles — à défaut, contact@proparjour.fr.]`,
  },
  {
    titre: "3. Données que nous traitons",
    texte: `Selon votre profil et votre usage de la plateforme :

Compte et identité — prénom, nom, adresse e-mail, numéro de téléphone, ville, type de compte, mot de passe (stocké haché par le service d'authentification). Si vous utilisez « Continuer avec Google », Google nous transmet votre adresse e-mail et votre nom.

Recruteur professionnel — raison sociale, SIRET, secteur d'activité.

Profil prestataire — métier, titre, statut d'indépendant, spécialités, compétences, langues, tenue, secteur et années d'expérience, présentation, ville, tarif, disponibilités, zones de déplacement, photo de profil, expériences et formations déclarées.

Vérification du profil prestataire (contrôle « KYC ») — pièce d'identité et, selon le métier, carte professionnelle CNAPS (sécurité privée), carte professionnelle, attestation URSSAF, extrait Kbis ou avis de situation SIRENE. Ces fichiers sont stockés dans un espace privé, non public, consultables uniquement par l'équipe de validation via des liens temporaires.

Coordonnées bancaires du prestataire — IBAN et BIC, aux fins de versement des sommes dues. Ces données sont chiffrées au repos ; leur consultation par un administrateur est restreinte et journalisée.

Offres, demandes et missions — intitulé, description, métier, ville, date, horaires, tarif, lieu, modalités d'accès, contact sur place, consignes particulières.

Candidatures — message de candidature, statut, date de consultation du profil.

Messagerie — contenu des messages échangés entre recruteur et prestataire au sujet d'une mission, y compris les devis.

Avis — note de 1 à 5 et commentaire ; le prénom de l'auteur est affiché publiquement à côté de l'avis.

Paiements — montant, statut, taux et montant de commission, référence de l'opération de paiement Stripe, référence du virement de versement. Aucun numéro de carte bancaire n'est stocké par ProParJour (voir article 5).

Notifications — type, titre et contenu des notifications qui vous sont adressées.

Journal d'administration — les actions réalisées par les administrateurs de la plateforme (dont la consultation d'un IBAN) sont enregistrées à des fins de traçabilité.

Mesure d'audience (si vous y consentez) — chemin des pages consultées, type d'appareil (mobile / ordinateur) et un identifiant de session aléatoire non persistant. Aucun cookie tiers, aucune technique d'identification (« fingerprinting »), aucune donnée directement identifiante.

Données techniques et de sécurité — votre adresse IP et, lors d'une tentative de connexion, l'adresse e-mail saisie sont utilisées comme identifiants techniques temporaires pour limiter les tentatives abusives (connexion, paiement, envoi de vues). Des identifiants de session d'authentification sont également gérés.`,
  },
  {
    titre: "4. Finalités et bases légales",
    texte: `Création et gestion du compte, mise en relation recruteurs / prestataires, messagerie, notifications, e-mails transactionnels — exécution du contrat (CGU acceptées à l'inscription).

Traitement des paiements, séquestre des fonds et versement aux prestataires — exécution du contrat et respect d'obligations légales comptables.

Vérification de l'identité et des pièces justificatives des prestataires — exécution du contrat et respect d'obligations légales (notamment le Code de la sécurité intérieure pour les métiers de la sécurité privée).

Publication et affichage des avis — exécution du contrat / intérêt légitime à la fiabilité de la plateforme (à confirmer).

Sécurité de la plateforme, prévention de la fraude, limitation des tentatives abusives, prévention du contournement de la mise en relation — intérêt légitime.

Mesure d'audience de première partie — consentement (bandeau de gestion des cookies, catégorie « audience »).

Facturation et respect des obligations comptables et fiscales — obligation légale.

[À FOURNIR/VALIDER PAR LE RESPONSABLE LÉGAL : confirmer les bases légales retenues ; préciser, le cas échéant, les finalités de prospection commerciale et la base associée — aucun envoi de ce type n'est présent dans le code à ce jour.]`,
  },
  {
    titre: "5. Destinataires et sous-traitants",
    texte: `Vos données sont accessibles aux équipes habilitées de ProParJour et aux prestataires techniques suivants, identifiés d'après la configuration du projet :

— Supabase, Inc. — base de données, service d'authentification et stockage des fichiers (projet configuré pour une région de traitement dans l'Union européenne, à confirmer).
— Stripe — traitement des paiements par carte bancaire. La saisie de la carte se fait dans un composant hébergé par Stripe : aucun numéro de carte ne transite ni n'est stocké sur les serveurs de ProParJour (conformité PCI-DSS déléguée à Stripe).
— Resend — envoi des e-mails transactionnels (notifications de mission, de candidature, de messagerie).
— Vercel Inc. — hébergement de l'application web.
— API publiques de l'État français « Base Adresse Nationale » (api-adresse.data.gouv.fr) et « API Géo » (geo.api.gouv.fr) — le texte que vous saisissez dans les champs d'adresse ou de ville leur est transmis pour proposer des suggestions. Ces services sont opérés indépendamment par l'administration française.
— Google — uniquement si vous choisissez de vous connecter via Google.

Les données de votre profil prestataire, ainsi que vos avis, sont visibles des recruteurs dans le cadre de la mise en relation ; une fiche publique limitée peut être exposée aux visiteurs non connectés une fois le profil validé. Aucune donnée n'est vendue à des tiers.

[À FOURNIR/VALIDER PAR LE RESPONSABLE LÉGAL : confirmer l'entité contractante de chaque prestataire et compléter la liste si d'autres outils sont ajoutés.]`,
  },
  {
    titre: "6. Transferts hors Union européenne",
    texte: `Certains prestataires techniques (notamment Vercel, Stripe et Resend) sont des sociétés établies aux États-Unis ou susceptibles d'y réaliser des traitements. Ces transferts doivent être encadrés par les garanties appropriées prévues par le RGPD (clauses contractuelles types de la Commission européenne et/ou certification Data Privacy Framework).

[À FOURNIR/VALIDER PAR LE RESPONSABLE LÉGAL : confirmer, pour chaque prestataire, la localisation réelle des traitements et le mécanisme de transfert applicable au jour de la mise en ligne.]`,
  },
  {
    titre: "7. Durées de conservation",
    texte: `Éléments connus du fonctionnement de la plateforme :
— Mesure d'audience : les vues de pages sont automatiquement supprimées au-delà de 90 jours.
— Limitation de débit : les compteurs techniques (adresse IP, e-mail de connexion) sont transitoires (fenêtre glissante de quelques minutes).
— Compte et données associées : conservés tant que le compte existe ; la suppression du compte (voir article 9) entraîne l'effacement en cascade des données liées.
— Facture et pièces comptables : 10 ans, au titre des obligations comptables et fiscales (à confirmer).

[À FOURNIR/VALIDER PAR LE RESPONSABLE LÉGAL : fixer les durées applicables — notamment : pièces de vérification d'identité (KYC) ; messages, missions, candidatures et avis après la fin de la relation ; journal d'administration ; durée d'inactivité entraînant la suppression d'office d'un compte.]`,
  },
  {
    titre: "8. Vos droits",
    texte: `Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité concernant vos données, ainsi que du droit de définir des directives relatives à leur sort après votre décès.

Une partie de ces droits s'exerce directement depuis votre espace « Paramètres » (mise à jour de vos informations, demande de suppression de compte). Pour toute autre demande, écrivez à contact@proparjour.fr [ou à l'adresse du DPO, le cas échéant].

Vous pouvez également introduire une réclamation auprès de la Commission nationale de l'informatique et des libertés (CNIL) — www.cnil.fr.`,
  },
  {
    titre: "9. Suppression de votre compte",
    texte: `Depuis « Paramètres » › « Supprimer mon compte », vous pouvez demander la suppression de votre compte en indiquant un motif. La demande est enregistrée puis traitée par un administrateur.

Une mission encore active (en attente, confirmée, en cours ou en litige) doit d'abord être menée à son terme. Une fois la demande acceptée, votre compte et les données personnelles associées sont effacés ; une entrée est conservée dans le journal d'administration à des fins de traçabilité, sans vos coordonnées. Les documents exigés par la loi (factures notamment) sont conservés le temps légalement requis.`,
  },
  {
    titre: "10. Cookies et traceurs",
    texte: `Cookies strictement nécessaires — un cookie de session est utilisé pour vous maintenir connecté. Il n'a aucune finalité publicitaire et ne nécessite pas votre consentement.

Stockage local de votre navigateur — vos préférences de cookies, votre panier, vos favoris, vos brouillons de besoin et l'identifiant de session de mesure d'audience sont conservés localement dans votre navigateur et ne sont pas transmis automatiquement à nos serveurs.

Mesure d'audience de première partie — activée uniquement si vous l'acceptez via le bandeau de consentement (catégorie « audience »). Elle n'utilise ni cookie tiers, ni pixel publicitaire, ni technique d'identification.

Cookies marketing — aucun cookie ou pixel publicitaire n'est déployé à ce jour ; la catégorie « marketing » du bandeau est présente par anticipation et reste sans effet tant qu'aucun outil de ce type n'est ajouté.

Polices d'écriture — les polices sont auto-hébergées : aucune requête n'est adressée à un service tiers lors du chargement des pages.

Vous pouvez modifier vos choix à tout moment via le bandeau de gestion des cookies.`,
  },
  {
    titre: "11. Sécurité",
    texte: `ProParJour met en œuvre des mesures techniques et organisationnelles, parmi lesquelles : chiffrement des échanges (HTTPS), cloisonnement des accès aux données par rôle, double authentification obligatoire pour les comptes d'administration, chiffrement au repos des coordonnées bancaires, journalisation des actions d'administration, limitation du débit sur les points sensibles, neutralisation des tentatives de partage de coordonnées de contact hors plateforme, et en-têtes de sécurité du navigateur.`,
  },
  {
    titre: "12. Modifications",
    texte: `La présente politique peut évoluer. La date de dernière mise à jour figure en tête de page. En cas de modification substantielle, les utilisateurs concernés en sont informés.`,
  },
] as const;
