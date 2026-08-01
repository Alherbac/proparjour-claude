# Cahier des charges — ProParJour

## 1. Résumé du projet

**Nom du site : ProParJour**

**Périmètre de ce cahier des charges : le site web uniquement.** L'application mobile fera l'objet d'un cahier des charges séparé, dans un second temps, une fois le site web développé et stable.

Créer une plateforme web de mise en relation entre :

- **Des recruteurs** : entreprises OU particuliers ayant besoin ponctuellement de personnel qualifié (à la journée, à l'heure, ou sur une mission courte).
- **Des prestataires freelances** : agents de sécurité, hôtes/hôtesses d'accueil, vendeurs/commerciaux en intérim (boutique, restaurant, événementiel).

Le modèle s'inspire de plateformes comme Malt, avec une logique de **panier multi-prestataires** : un recruteur peut réserver plusieurs prestataires en une seule commande, de métiers différents ou du même métier à des horaires différents.

**Zone de couverture (lancement) :** Île-de-France uniquement. Si un utilisateur saisit une ville hors Île-de-France (recherche de prestataire ou lieu de mission), la plateforme affiche un message du type : *"Bientôt disponible dans votre ville — pour l'instant, le service est disponible uniquement en Île-de-France."* Cette limitation doit être gérée côté code de façon à pouvoir être élargie facilement (liste de villes/régions actives configurable, pas codée en dur).

---

## 1 bis. Identité visuelle et pages déjà validées

Une première version du site a été conçue (sur Lovable) et sert de référence visuelle à reproduire fidèlement dans la reconstruction via Claude Code.

**Charte graphique :**
- Couleur principale : rouge (logo, boutons CTA, accents)
- Fond : beige/crème clair sur les sections héro
- Typographie : titres en serif pour les gros titres d'accroche, texte courant en sans-serif
- Logo : icône carrée rouge arrondie + texte "Pro**Par**Jour" (le "Par" en rouge, le reste en noir)

**Structure de pages/sections déjà définie :**
- **Header** : logo, barre de recherche double (champ "Métier..." + champ "Ville..." avec bouton loupe rouge), navigation (Prestataire / Entreprise / Contact), icônes (thème, notifications), bouton "Tableau de bord"
- **Page d'accueil — Hero** : titre d'accroche "Trouvez les meilleurs freelances de terrain, à la demande", 3 badges de filière cliquables (Sécurité privée / Accueil & Réception / Commerce & Retail), paragraphe de présentation citant explicitement les agents de sécurité certifiés CNAPS, les hôtes/hôtesses d'accueil, les vendeurs et le personnel de commerce, deux CTA principaux ("Je recrute un prestataire" en rouge plein / "Je propose mes services" en outline), bandeau de réassurance (Profils vérifiés / Paiement sécurisé / Assistance 24/7), et visuel avec badges flottants ("Qualité Premium — Service vérifié", note "5.0", mini-liste "Prestataires vérifiés")
- **Section "Travailleurs indépendants et entreprises : une relation exclusive et profitable"** : deux blocs côte à côte — "Pour les Prestataires Indépendants" (Liberté de choisir, Rémunération transparente, Clients sérieux, Valorisation) et "Pour les Entreprises" (Réactivité immédiate, Simplicité opérationnelle, Optimisation des coûts, Expertise à la demande) — avec visuel d'illustration (poignée de main) à droite
- **Section "Freelances de la région"** : carrousel de cartes prestataires (photo, prénom, métier, badge localisation "Île de France"), avec flèches de navigation gauche/droite, sous-titre "Des professionnels qualifiés près de chez vous en Île-de-France"

---

## 2. Utilisateurs et rôles

### 2.1 Recruteur
- Peut être une **entreprise** (avec raison sociale, SIRET, secteur d'activité) ou un **particulier** (nom, prénom, adresse).
- Publie des besoins ou recherche directement des prestataires disponibles.
- Peut réserver plusieurs prestataires en une seule commande via un **panier**.

### 2.2 Prestataire (freelance)
- Statut indépendant (auto-entrepreneur, société, etc.) — à déclarer lors de l'inscription.
- Un des 3 métiers :
  - **Agent de sécurité / Protection** (nécessite carte professionnelle CNAPS en France + justificatif)
  - **Hôte/Hôtesse d'accueil** (profil axé présentation : photo, langues parlées, tenue)
  - **Vendeur / Commercial en intérim** (boutique, restaurant, salon, événementiel)
- Renseigne : compétences, spécialités, zone géographique, tarif (TJM ou taux horaire), disponibilités, photo de profil, pièces justificatives selon métier.

### 2.3 Administrateur
- Pilote la plateforme depuis un **tableau de bord unique, conçu comme une véritable tour de contrôle** (détail en section 3.10).
- Valide les profils prestataires (avec vérification CNAPS).
- Fixe et ajuste la commission de la plateforme.
- Consulte les fiches complètes des utilisateurs (recruteurs et prestataires) sans quitter le dashboard.
- Supervise toutes les missions (en cours et terminées), gère les litiges, remboursements et signalements.
- Peut contacter directement un utilisateur via messagerie (ex : demande de pièce justificative complémentaire).

---

## 3. Fonctionnalités clés

### 3.1 Inscription / Onboarding
- **Recruteur** : choix du type de compte (entreprise / particulier) dès l'inscription, avec champs adaptés à chacun.
- **Prestataire** : tunnel d'inscription par étapes (coordonnées → métier → spécialités → localisation → tarif/disponibilité → photo → justificatifs → CGU), avec upload des documents selon le métier choisi (carte CNAPS pour la sécurité, par exemple).
- Inscription via email/mot de passe ET via Google (OAuth), avec le même niveau de complétude de profil requis pour les deux parcours.

### 3.2 Recherche et matching
- Recherche de prestataires par métier, spécialité, zone géographique, disponibilité, tarif.
- Filtres combinables (ex : "hôtesse d'accueil, bilingue anglais, disponible samedi, région parisienne").
- Fiche prestataire détaillée : photo, expérience, avis clients, tarif, disponibilités, badges de vérification (CNAPS validé, identité vérifiée, etc.).

### 3.3 Panier multi-prestataires (spécificité clé du projet)
- Le recruteur peut ajouter **plusieurs prestataires à un même panier**, avant validation de la commande.
- Le panier doit supporter :
  - Des **métiers différents** dans une même commande (ex : 1 agent de sécurité + 2 hôtesses pour un événement).
  - Le **même métier avec des créneaux/horaires différents** (ex : 2 vendeurs, l'un de 9h à 13h, l'autre de 13h à 18h).
- Pour chaque ligne du panier : prestataire sélectionné, date, heure de début, heure de fin, lieu de mission, tarif appliqué.
- Récapitulatif global de la commande avant paiement (total, détail par prestataire).
- Gestion des cas où un prestataire du panier devient indisponible avant validation (alerte + proposition de remplacement).

### 3.4 Réservation et gestion de mission
- Confirmation de la mission par le prestataire (acceptation/refus dans un délai donné).
- Statuts de mission : en attente, confirmée, en cours, terminée, annulée, litige.
- Tableau de bord recruteur : suivi de toutes ses missions en cours et passées, avec statut de chaque prestataire réservé.
- Tableau de bord prestataire : missions proposées, acceptées, calendrier de disponibilité.

### 3.5 Paiement et politique d'annulation
- Paiement en ligne par le recruteur au moment de la réservation (CB, éventuellement autres moyens).
- Séquestre des fonds jusqu'à la fin de mission (paiement différé au prestataire), avec commission plateforme prélevée automatiquement — **commission dont le taux est fixé et modifiable par l'administrateur depuis le tableau de bord** (globalement et/ou par métier si besoin).
- Génération de factures pour le recruteur et de justificatifs de paiement pour le prestataire.
- **Politique d'annulation fixe : annulation possible jusqu'à 48h avant le début de la mission.** Passé ce délai, la mission est considérée comme effectuée (le recruteur est facturé en totalité, le prestataire est payé comme si la mission avait eu lieu).

### 3.6 Avis et notation
- Notation bidirectionnelle : le recruteur note le prestataire après la mission, et inversement.
- Affichage de la note moyenne et des avis sur le profil prestataire.

### 3.7 Messagerie
Trois canaux de messagerie distincts sont nécessaires :
- **Recruteur ↔ Prestataire** : chat lié à une mission, pour échanger avant/pendant la mission (lieu précis, consignes, etc.), et pour dérouler le **cycle de vie de la mission** : acceptation de la mission par le prestataire → déclaration "service fait" (par le prestataire et/ou confirmation du recruteur) → déclenchement du versement du paiement au prestataire une fois le service confirmé.
- **Administrateur → Utilisateur** (recruteur ou prestataire) : messagerie descendante depuis le tableau de bord admin, utilisée notamment pour demander des pièces justificatives complémentaires, notifier une suspension de compte, etc.
- **Utilisateur → Administrateur** : possibilité pour tout utilisateur de contacter le support/admin (signalement, question, litige).

### 3.8 Notifications
- Notifications web (in-app, cloche de notification déjà présente dans le header) + email + SMS pour les rappels critiques : nouvelle mission proposée, confirmation, rappel avant mission, paiement reçu, nouvel avis, message reçu de l'administrateur.
- Les notifications push mobile seront ajoutées lors du développement de l'application, dans un second temps.

### 3.9 Cycle de vie d'une mission (dialogue client-prestataire)
1. **Réservation** : le recruteur ajoute le prestataire au panier et paie (fonds séquestrés).
2. **Acceptation** : le prestataire reçoit la demande et doit l'accepter (ou la refuser) dans un délai donné.
3. **Réalisation** : le jour J, le prestataire exécute la mission.
4. **Déclaration "service fait"** : à la fin de la mission, le prestataire (et/ou le recruteur) confirme que le service a été réalisé, via l'app.
5. **Déblocage du paiement** : une fois le "service fait" confirmé (ou automatiquement après un délai sans contestation), les fonds séquestrés sont libérés et versés au prestataire, commission plateforme déduite.
6. **Avis** : les deux parties peuvent ensuite se noter mutuellement.
En cas de litige à l'étape 4 (désaccord sur la réalisation du service), la mission bascule en statut "litige" et devient visible et arbitrable depuis le tableau de bord administrateur.

### 3.10 Tableau de bord administrateur — Tour de contrôle
Le back-office admin n'est pas une simple interface de modération : c'est l'**outil de pilotage stratégique** de la plateforme. Il doit regrouper :
- **Vue d'ensemble / KPIs** : nombre de missions en cours, missions terminées, chiffre d'affaires, commissions perçues, taux d'annulation, nombre de nouveaux prestataires/recruteurs, taux de conversion recherche → réservation, répartition par métier et par zone.
- **Validation des utilisateurs** :
  - File d'attente des prestataires en attente de validation.
  - Vérification CNAPS des agents de sécurité : intégration d'une **API officielle si elle existe** pour automatiser le contrôle (à date, le CNAPS ne propose pas d'API publique ouverte aux plateformes tierces — la vérification se fait via son téléservice DRACAR, en ligne, avec nom + numéro de carte ; à surveiller/revalider avant développement car cela peut évoluer). En l'absence d'API exploitable, **validation manuelle par l'admin obligatoire**, avec consultation du justificatif uploadé directement depuis la fiche du prestataire dans le dashboard, et statut à jour (carte active, expirée, suspendue).
  - Possibilité de valider ou refuser un profil manuellement en un clic, avec motif de refus.
- **Fiches utilisateurs consultables sans sortir du dashboard** : recruteurs (historique de commandes, entreprise ou particulier, moyens de paiement) et prestataires (profil complet, documents, historique de missions, notes, revenus générés).
- **Supervision des missions** : liste filtrable de toutes les missions (en attente, confirmées, en cours, terminées, annulées, en litige), avec accès au détail de chaque mission (panier, prestataires, montants, échanges de messages).
- **Gestion des commissions** : configuration du taux de commission (global et/ou par métier), historique des commissions perçues.
- **Gestion des litiges** : vue dédiée pour arbitrer les missions contestées (accès aux messages, preuves, décision de remboursement partiel/total ou de déblocage du paiement).
- **Messagerie admin → utilisateur** intégrée directement dans les fiches utilisateurs (ex : demande de document manquant).
- **Aide à la décision** : la vue d'ensemble doit permettre à l'administrateur d'identifier rapidement les tendances (métiers en tension, zones sous-couvertes, prestataires les mieux/moins bien notés) pour orienter les décisions business (ex : ajuster la commission, prioriser le recrutement de prestataires sur un métier donné).

---

## 4. Spécificités par métier

| Métier | Champs/justificatifs spécifiques | Particularités de mission |
|---|---|---|
| Agent de sécurité | Numéro de carte professionnelle CNAPS + upload du justificatif, certifications (SSIAP, SST...) | Missions souvent récurrentes, vérification stricte obligatoire avant activation du profil |
| Hôte/Hôtesse d'accueil | Langues parlées, taille/tenue (optionnel selon usage), photo obligatoire | Missions événementielles courtes fréquentes (salons, soirées) |
| Vendeur/Commercial en intérim | Secteur d'expérience (boutique, restaurant, salon), éventuel mode de rémunération à la commission en plus du taux horaire | Missions en boutique/restaurant, possibilité de rémunération variable |

---

## 5. Modèle économique

- Commission prélevée par la plateforme sur chaque mission (pourcentage à définir, ex : 15-20 %).
- Le tarif prestataire peut être : à la journée (TJM), à l'heure, ou avec une composante commission sur vente pour les profils commerciaux.

---

## 6. Stack technique — site web, niveau production (sécurité + scalabilité)

Objectif : une stack capable de tenir la charge de plateformes comme Malt ou Fiverr (des milliers d'utilisateurs simultanés), avec un niveau de sécurité adapté à la gestion de paiements et de documents d'identité. Uniquement du code de production réel, pas d'outil no-code.

### 6.1 Stack applicative

| Brique | Technologie recommandée | Pourquoi |
|---|---|---|
| Front-end web | **Next.js (React) + TypeScript** | Standard des grandes marketplaces : rendu serveur (SSR) pour le SEO des fiches prestataires, performance, App Router pour un chargement optimisé |
| Styling / UI | **Tailwind CSS + shadcn/ui** | Composants accessibles, cohérence visuelle, rapidité de développement |
| Back-end / API | **Node.js (NestJS)**, architecture API REST modulaire | Framework structuré (modules, injection de dépendances) adapté à une logique métier complexe et à la maintenabilité à grande échelle |
| Base de données | **PostgreSQL** (hébergement géré : Supabase, Neon ou AWS RDS) | Base relationnelle robuste, transactions ACID indispensables pour les paiements/panier, Row Level Security pour isoler les données par rôle |
| Cache | **Redis** | Mise en cache des recherches fréquentes, gestion des sessions, limitation de débit (rate limiting) |
| Paiement | **Stripe Connect** | Référence du secteur pour les marketplaces : séquestre des fonds, paiement différé, répartition automatique de la commission, conformité PCI-DSS déléguée à Stripe (aucune donnée bancaire ne transite par le serveur ProParJour) |
| Authentification | **Auth.js ou Supabase Auth**, email/mot de passe + OAuth Google, hashage des mots de passe (bcrypt/argon2), authentification à deux facteurs pour les comptes admin | Sécurité des accès, standard de l'industrie |
| Stockage documents | **Bucket S3-compatible chiffré** (AWS S3 ou équivalent), URLs signées à durée limitée pour l'accès aux justificatifs (carte CNAPS, pièce d'identité) | Confidentialité et traçabilité des documents sensibles |
| Messagerie temps réel | **WebSockets** (Socket.io ou Supabase Realtime) | Chat recruteur↔prestataire et admin↔utilisateur en temps réel |
| Recherche | **PostgreSQL full-text search** au démarrage, migration vers **Meilisearch ou Algolia** si le volume de prestataires/recherches grandit fortement | Recherche rapide et filtrable par métier/zone/disponibilité, scalable |
| Emails / SMS | **Resend ou SendGrid** (email) · **Twilio** (SMS) | Fiabilité de délivrabilité, standard du secteur |
| Hébergement front | **Vercel** | CDN mondial intégré, déploiement continu, scalabilité automatique du front |
| Hébergement back | **AWS, Railway ou Render**, avec possibilité de scaling horizontal (plusieurs instances derrière un load balancer) | Absorbe la montée en charge sans réécriture d'architecture |
| Monitoring / Observabilité | **Sentry** (erreurs), **Better Stack ou Datadog** (logs, performance) | Détection proactive des problèmes avant qu'ils n'affectent les utilisateurs |
| CI/CD | **GitHub Actions** | Tests automatisés et déploiement fiable à chaque mise à jour du code |

### 6.2 Exigences de sécurité (niveau plateforme de paiement)

- **Chiffrement** : HTTPS/TLS obligatoire sur tout le site, chiffrement au repos des données sensibles (documents CNAPS, données personnelles) en base et en stockage.
- **Authentification renforcée** : mots de passe hashés (jamais stockés en clair), politique de mot de passe robuste, 2FA obligatoire pour les comptes administrateur.
- **Autorisations strictes** : Row Level Security en base de données pour garantir qu'un recruteur ne peut jamais accéder aux données d'un autre recruteur, qu'un prestataire ne voit que ce qui le concerne, etc.
- **Protection contre les attaques courantes (OWASP Top 10)** : protection injection SQL (ORM avec requêtes préparées), XSS, CSRF, validation stricte de toutes les entrées utilisateur côté serveur (jamais de confiance aveugle au front).
- **Rate limiting** : limitation du nombre de requêtes par IP/utilisateur (via Redis) pour empêcher le brute-force sur les formulaires de connexion et les abus d'API.
- **Paiement** : aucune donnée de carte bancaire ne transite ni n'est stockée sur les serveurs ProParJour — tout passe par Stripe (conformité PCI-DSS déléguée).
- **RGPD** : conformité obligatoire (hébergement des données en UE, droit à l'export/suppression des données, consentement explicite pour les cookies non essentiels, politique de confidentialité claire), avec une attention particulière aux documents d'identité et cartes professionnelles CNAPS qui sont des données sensibles.
- **Audits et logs** : journalisation des actions sensibles (validation de profil, modification de commission, accès aux justificatifs) pour traçabilité en cas de litige ou de contrôle.
- **Sauvegardes** : sauvegardes automatiques et régulières de la base de données, avec tests de restauration.

### 6.3 Exigences de scalabilité (des milliers d'utilisateurs)

- **Architecture stateless côté back-end** : aucune session stockée en mémoire locale du serveur, pour permettre d'ajouter des instances serveur sans perte de cohérence (scaling horizontal).
- **Cache Redis** sur les recherches et données fréquemment consultées (fiches prestataires populaires, résultats de recherche par zone) pour réduire la charge sur la base de données.
- **CDN** (intégré à Vercel) pour servir les assets statiques (images, CSS, JS) au plus près de chaque utilisateur.
- **Indexation base de données** soignée dès la conception sur les colonnes de recherche fréquente (métier, ville, disponibilité) pour garantir des temps de réponse rapides même avec un grand volume de prestataires.
- **Pagination systématique** sur toutes les listes (résultats de recherche, missions, historique) pour éviter de charger des milliers de lignes en une fois.
- **File d'attente asynchrone** (ex : BullMQ avec Redis) pour les tâches non bloquantes (envoi d'email/SMS, traitement post-paiement) afin de ne jamais ralentir la réponse à l'utilisateur.
- **Tests de charge** avant le lancement (ex : avec k6 ou Artillery) pour valider que la plateforme tient la charge visée avant l'ouverture au public.

Cette stack permet de développer l'intégralité du site avec un contrôle total du code (via Claude Code), sur des bases identiques à celles des grandes marketplaces du marché, avec une marge de croissance sans refonte nécessaire.

---

## 7. Modèle de données (aperçu simplifié)

- `users` (type: recruteur_entreprise / recruteur_particulier / prestataire / admin)
- `entreprises` (rattaché à un user recruteur entreprise : raison sociale, SIRET, secteur)
- `prestataires_profils` (métier, spécialités, tarif, zone, disponibilités, statut de vérification)
- `zones_couverture` (villes/régions actives — permet d'élargir la couverture géographique sans redéploiement)
- `justificatifs` (type de document, fichier, statut de validation — manuelle ou via API CNAPS, prestataire lié)
- `missions` (recruteur, statut, lieu, date, statut "service_fait", statut "litige")
- `mission_lignes` (mission liée, prestataire, métier, heure_debut, heure_fin, tarif appliqué, statut d'acceptation) — **table clé pour le panier multi-prestataires**
- `paiements` (mission liée, montant, statut, taux de commission appliqué, montant commission, date de déblocage)
- `commissions_config` (taux global et/ou par métier, historique des modifications, fixé par l'admin)
- `avis` (mission liée, auteur, cible, note, commentaire)
- `messages` (conversation liée à une mission ou à un échange admin↔utilisateur, expéditeur, destinataire, type de canal)
- `litiges` (mission liée, motif, statut, décision admin)

---

## 8. Parcours utilisateur type (illustration du panier)

1. Un particulier organise un événement et a besoin d'1 agent de sécurité (18h-2h) et de 2 hôtesses (18h-23h chacune).
2. Il recherche et sélectionne un agent de sécurité disponible → l'ajoute au panier avec le créneau 18h-2h.
3. Il recherche et sélectionne une première hôtesse → l'ajoute au panier avec le créneau 18h-23h.
4. Il recherche et sélectionne une seconde hôtesse → l'ajoute au panier avec le même créneau 18h-23h.
5. Il consulte le récapitulatif du panier (3 lignes, 3 tarifs, total).
6. Il valide et paie en une seule transaction.
7. Chacun des 3 prestataires reçoit une notification de mission à confirmer individuellement.

---

## 9. Ordre de développement recommandé

Le développement doit suivre un ordre logique : d'abord les fondations techniques, puis les parcours qui génèrent de la valeur le plus tôt possible (voir un prestataire, s'inscrire), avant les fonctionnalités qui dépendent d'autres briques (paiement, dashboard admin).

### Étape 1 — Fondations techniques
- Initialisation du projet (Next.js + TypeScript, Tailwind, structure du dépôt).
- Mise en place de la base de données PostgreSQL et du modèle de données de base (users, prestataires_profils, entreprises).
- Authentification (email/mot de passe + OAuth Google), gestion des rôles (recruteur entreprise / recruteur particulier / prestataire / admin).
- Mise en place de l'hébergement et du pipeline de déploiement (Vercel + CI/CD).

### Étape 2 — Pages publiques et identité visuelle
- Header (recherche double, navigation, icônes) et footer.
- Page d'accueil : hero avec les 3 filières, section "Travailleurs indépendants et entreprises", section "Freelances de la région" (carrousel).
- Charte graphique appliquée (couleurs, typographie, composants réutilisables).

### Étape 3 — Inscription et profils
- Tunnel d'inscription prestataire par étapes (coordonnées → métier → spécialités → localisation → tarif/disponibilité → photo → justificatifs → CGU).
- Inscription recruteur (entreprise / particulier).
- Page de profil public prestataire (fiche détaillée).
- Gestion de la zone de couverture Île-de-France (message "bientôt dans votre ville" hors zone).

### Étape 4 — Recherche et matching
- Moteur de recherche par métier, ville, disponibilité, tarif.
- Filtres combinables et affichage des résultats.
- Indexation base de données pour la performance de recherche.

### Étape 5 — Panier multi-prestataires et réservation
- Logique de panier (ajout de plusieurs prestataires, métiers différents ou créneaux différents).
- Récapitulatif de commande.
- Statuts de mission (en attente, confirmée, en cours, terminée, annulée, litige).
- Tableaux de bord recruteur et prestataire (suivi des missions).

### Étape 6 — Paiement
- Intégration Stripe Connect (séquestre des fonds, commission automatique).
- Génération de factures.
- Politique d'annulation 48h.

### Étape 7 — Cycle de vie de la mission et messagerie
- Acceptation de mission par le prestataire.
- Déclaration "service fait" et déblocage du paiement.
- Messagerie recruteur ↔ prestataire (WebSockets).
- Notifications (in-app, email, SMS).

### Étape 8 — Avis et notation
- Notation bidirectionnelle après mission.
- Affichage des notes et avis sur les profils.

### Étape 9 — Tableau de bord administrateur (tour de contrôle)
- Vue d'ensemble / KPIs.
- Validation des utilisateurs (dont vérification CNAPS).
- Fiches utilisateurs consultables depuis le dashboard.
- Supervision des missions, gestion des litiges.
- Configuration des commissions.
- Messagerie admin → utilisateur.

### Étape 10 — Sécurisation, tests et mise en production
- Renforcement sécurité (rate limiting, audits, RGPD).
- Tests de charge.
- Monitoring (Sentry, logs).
- Mise en production.

---

## 10. Points ouverts à trancher avant développement

- Taux de commission initial à fixer par l'administrateur (valeur de départ, avant ajustement dans le dashboard).
- Confirmer si une API CNAPS exploitable existe au moment du développement (à ce jour, seul un téléservice web — DRACAR — est disponible côté CNAPS, sans API publique documentée pour intégration tierce) ; prévoir la validation manuelle comme solution par défaut.
- Gestion des profils vendeurs à commission (comment la commission sur vente est déclarée et payée).
- Délai précis pour la confirmation "service fait" avant déblocage automatique du paiement en l'absence de contestation (ex : 24h, 48h ?).
- Modalités exactes de résolution des litiges (remboursement partiel possible ou uniquement total/refusé ?).
