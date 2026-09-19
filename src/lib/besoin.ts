import type { MetierId } from "@/config/metiers";
import { normaliserTexte, motsProches } from "@/lib/similarite-texte";
import type { JourneeMission } from "@/lib/journees";

/**
 * Extraction heuristique (mots-clés + regex), volontairement légère
 * — pas de vrai NLP/IA. Utilisable côté client (pas de dépendance
 * serveur), contrairement à lib/recherche.ts qui importe le client
 * Supabase serveur (next/headers) et ne peut donc pas être réutilisé
 * ici tel quel — seule la source de vérité des métiers (config/metiers)
 * est partagée pour ne pas dupliquer la taxonomie elle-même.
 */

/** Moment de journée cité sans horaire précis ("vendredi soir") — jamais converti en heure inventée, seulement affiché comme indice. */
export type MomentJournee = "matin" | "apres-midi" | "soir" | "nuit";

/**
 * Lot C — une information CERTAINE mais pas garantie : déjà préremplie
 * (jamais bloquante), mais accompagnée d'une confirmation explicite
 * plutôt qu'appliquée en silence comme une donnée sûre. `propose` est
 * la valeur brute déjà dans le champ correspondant (ISO pour "date",
 * "HH:mm" pour "horaires") — la mise en forme humaine ("vendredi 28
 * août") reste du ressort de l'UI, qui la connaît déjà pour l'affichage
 * normal des cartes (cahier §1 : "ne jamais bloquer inutilement").
 */
export type ChampAmbigu = "date" | "horaires";
export type Ambiguite = { champ: ChampAmbigu; propose: string; question: string };

/** Lot C §8 — une contrainte "requise" (par défaut) ou explicitement assouplie ("si possible...") ne doit jamais être traitée comme une obligation. */
export type NiveauContrainte = "requis" | "prefere";
export type ContrainteDetectee = { label: string; niveau: NiveauContrainte };

/** Lot C §7 — un contexte littéral et spécifique ("Mariage", "Concert") est certain ; un mot générique ("soirée", "événement" seuls) reste probable, jamais affiché comme acquis sans confirmation. */
export type ContexteDetecte = { label: string; certain: boolean };

export type BesoinExtrait = {
  metier: MetierId | null;
  ville: string | null;
  quantite: number | null;
  date: string | null; // ISO yyyy-mm-dd, résolu si un jour/moment a été reconnu
  heureDebut: string | null; // HH:mm
  heureFin: string | null; // HH:mm
  moment: MomentJournee | null; // renseigné seulement quand heureDebut est null
  // Lot B — voir CONTEXTES/CONTRAINTES plus bas. Sur ce type mono-métier,
  // calculés sur le texte entier (un seul métier détecté, aucune ambiguïté
  // d'attribution possible) — contrairement à SousBesoin.contraintes qui
  // reste strictement local à son segment.
  contexte: ContexteDetecte | null;
  contraintes: ContrainteDetectee[];
  // Lot C — date/heureDebut/heureFin restent préremplis comme avant
  // (§11 : ne jamais sur-questionner ce qui est déjà exploitable) ;
  // ambiguites signale seulement celles qui méritent une confirmation
  // visible plutôt qu'un silence. quantiteIncertaine/dateIncertaine :
  // AUCUNE valeur n'est proposée (voir §4 : "ne pas choisir
  // arbitrairement 2, 3 ou 5"), juste une question ouverte.
  ambiguites: Ambiguite[];
  quantiteIncertaine: boolean;
  dateIncertaine: boolean;
};

function normaliser(s: string): string {
  return normaliserTexte(s);
}

function tokeniserSimple(texteNormalise: string): string[] {
  return texteNormalise.split(/[^a-z0-9-]+/).filter(Boolean);
}

/**
 * Position du mot-clé dans le texte, -1 si absent. Les expressions à
 * plusieurs mots ("agent de securite") restent comparées en
 * sous-chaîne ; les mots-clés simples tolèrent une faute de frappe
 * (motsProches) en les comparant token par token, pas en sous-chaîne
 * — "securyte" ne doit pas non plus faire matcher "insecurite".
 */
function positionMotCle(texteNormalise: string, tokens: string[], mot: string): number {
  if (mot.includes(" ")) return texteNormalise.indexOf(mot);
  const trouve = tokens.find((token) => motsProches(token, mot));
  return trouve ? texteNormalise.indexOf(trouve) : -1;
}

/**
 * Source de vérité "famille → synonymes" — un seul endroit, réutilisé
 * par la détection de besoin structuré ici ET par la recherche libre
 * (lib/recherche.ts, en repli après la couverture par spécialités).
 * Chaque entrée est soit un mot simple (tolérance aux fautes via
 * motsProches), soit une expression à plusieurs mots (comparée en
 * sous-chaîne). Audité contre config/specialtyCategories.ts (aucun
 * synonyme ajouté qui ne correspondrait à aucune spécialité réelle
 * de la famille) et config/metiers.ts (3 filières réelles au
 * lancement — pas de 4ᵉ famille "manutention" inventée).
 *
 * Lot A (renforcement du vocabulaire) : entrées ajoutées uniquement
 * après avoir vérifié, par un test direct sur le code non modifié,
 * qu'elles manquaient réellement — "sécurité événementielle", "agent
 * de sûreté", "accueil événementiel", "hôte(sse) événementiel(le)"
 * étaient par exemple déjà couverts par les mots-clés "securite"/
 * "agent"/"accueil"/"hote"/"hotesse" déjà présents, donc pas dupliqués
 * ici. "controle d'acces" est répété avec l'apostrophe typographique
 * (’) en plus de l'apostrophe droite ('), la normalisation existante
 * ne les unifiant pas.
 */
export const METIER_MOTS_CLES: Record<MetierId, string[]> = {
  securite: [
    "securite",
    "agent",
    "agent de securite",
    "vigile",
    "garde du corps",
    "cynophile",
    "maitre-chien",
    "ssiap",
    "surveillance",
    // Lot D : "surveiller" (verbe) ajouté à côté de "surveillance" (nom) —
    // trop éloignés pour la tolérance aux fautes (motsProches, ±1 lettre
    // sur des mots de longueur proche) ; "Je cherche quelqu'un pour
    // surveiller l'entrée" ne détectait aucun métier sans cette entrée.
    "surveiller",
    "gardiennage",
    "gardien",
    "gardienne",
    "controle d'acces",
    "controle d’acces",
  ],
  // Lot B : "vip" retiré d'ici (présent brièvement en Lot A). "VIP" cité
  // seul décrit presque toujours l'ÉVÉNEMENT ("soirée VIP", "accueil
  // VIP" en tête de phrase), pas spécifiquement le métier accueil —
  // en le gardant ici, une phrase multi-métiers comme "Pour une soirée
  // VIP..., deux agents de sécurité..., une hôtesse..." faisait croire
  // au découpage par position que "accueil" commençait dès "VIP" (au
  // tout début de la phrase), avant même "sécurité" : la sécurité
  // héritait alors par erreur de tout le reste de la phrase, y compris
  // les contraintes de l'hôtesse (cahier §4, violation directe de la
  // règle "ne jamais mélanger"). "Accueil VIP"/"hôtesse VIP" restent
  // détectés normalement via "accueil"/"hote"/"hotesse" déjà présents ;
  // "VIP" seul est maintenant capturé côté CONTEXTES ("Événement VIP"),
  // sa vraie nature — un descriptif d'événement, pas un métier.
  accueil: ["accueil", "hote", "hotesse", "reception", "receptionniste", "standardiste", "conciergerie"],
  vente: [
    "vente",
    "vendeur",
    "vendeuse",
    "commercial",
    "commerce",
    "commercant",
    "commercante",
    "conseiller de vente",
    "conseillere de vente",
    "caissier",
    "caissiere",
    "caisse",
    "boutique",
    "retail",
    "distribution",
    "mise en rayon",
    "libre-service",
    "libre service",
  ],
};

/**
 * Exporté pour être réutilisé par lib/recherche.ts (vocabulaire
 * courant "vendeuse"/"vigile"/"hôtesse"…) en complément — jamais en
 * remplacement — de son propre classement par couverture de
 * spécialités, plus précis mais plus étroit sur les synonymes du
 * quotidien. Un seul vocabulaire de mots-clés métier, deux usages.
 */
export function detecterMetier(texteNormalise: string): MetierId | null {
  const tokens = tokeniserSimple(texteNormalise);
  for (const [metier, mots] of Object.entries(METIER_MOTS_CLES) as [MetierId, string[]][]) {
    if (mots.some((mot) => positionMotCle(texteNormalise, tokens, mot) !== -1)) return metier;
  }
  return null;
}

/** Position de la première occurrence de chaque métier mentionné dans le texte, triée par ordre d'apparition. */
function detecterMetiersAvecPosition(texteNormalise: string): { metier: MetierId; index: number }[] {
  const tokens = tokeniserSimple(texteNormalise);
  const resultats: { metier: MetierId; index: number }[] = [];
  for (const [metier, mots] of Object.entries(METIER_MOTS_CLES) as [MetierId, string[]][]) {
    let meilleurIndex = -1;
    for (const mot of mots) {
      const idx = positionMotCle(texteNormalise, tokens, mot);
      if (idx !== -1 && (meilleurIndex === -1 || idx < meilleurIndex)) meilleurIndex = idx;
    }
    if (meilleurIndex !== -1) resultats.push({ metier, index: meilleurIndex });
  }
  return resultats.sort((a, b) => a.index - b.index);
}

/**
 * Lot B — contexte (un seul, le plus spécifique) et contraintes
 * (plusieurs, cumulables) exprimés naturellement par le client. Même
 * esprit que METIER_MOTS_CLES : une seule source de vérité par
 * catégorie, un mot simple tokenisé exactement (pas de sous-chaîne —
 * "hotel" ne doit pas matcher à l'intérieur d'un mot plus long) ou une
 * expression à plusieurs mots comparée en sous-chaîne. Volontairement
 * SANS tolérance aux fautes (motsProches) : le risque de faux positif
 * d'une phrase entière mal comprise pèserait plus lourd ici que pour
 * un simple nom de métier — voir le §5 du cahier ("ne jamais
 * inventer"). Cette liste ne détecte que ce qui est explicitement
 * demandé par le cahier Lot B §1/§2 — jamais une déduction ("tenue
 * élégante" ne devient jamais "tenue noire", volontairement absent
 * de la liste plutôt que mappé à tort).
 */
function contientMot(texteNormalise: string, tokens: string[], mot: string): boolean {
  if (mot.includes(" ")) return texteNormalise.includes(mot);
  return tokens.includes(mot);
}

/**
 * Un seul contexte par demande : liste ordonnée du plus spécifique au
 * plus générique, on retient le premier qui matche ("soiree vip" avant
 * le générique "soiree", "ouverture de boutique" avant le générique
 * "boutique") — même idiome que MOMENTS plus bas dans ce fichier.
 * `certain` (Lot C §7) : un nom d'événement littéral et spécifique
 * (mariage, concert...) ne laisse guère de doute ; les deux entrées
 * génériques en fin de liste (soirée/événement seuls) restent
 * "probable" — elles ne disent presque rien sur la nature réelle de
 * l'événement, contrairement aux autres.
 */
const CONTEXTES: { label: string; mots: string[]; certain: boolean }[] = [
  { label: "Soirée VIP", mots: ["soiree vip"], certain: true },
  { label: "Événement VIP", mots: ["evenement vip", "accueil vip"], certain: true },
  { label: "Événement sportif", mots: ["evenement sportif"], certain: true },
  { label: "Mariage", mots: ["mariage"], certain: true },
  { label: "Concert", mots: ["concert"], certain: true },
  { label: "Salon / Congrès", mots: ["salon", "congres"], certain: true },
  { label: "Cocktail", mots: ["cocktail"], certain: true },
  { label: "Inauguration", mots: ["inauguration", "ouverture de boutique"], certain: true },
  { label: "Boîte de nuit", mots: ["boite de nuit"], certain: true },
  { label: "Hôtel", mots: ["hotel"], certain: true },
  { label: "Restaurant", mots: ["restaurant"], certain: true },
  { label: "Entreprise", mots: ["entreprise"], certain: true },
  { label: "Magasin / Boutique", mots: ["magasin", "boutique"], certain: true },
  { label: "Soirée", mots: ["soiree"], certain: false },
  { label: "Événement", mots: ["evenement", "evenementiel"], certain: false },
];

/** Plusieurs contraintes cumulables — chaque catégorie a des expressions volontairement distinctes pour ne jamais se déclencher deux fois sur la même phrase (ex. "Expérience VIP" et "Expérience demandée" ne partagent aucun mot-clé). */
const CONTRAINTES: { label: string; mots: string[] }[] = [
  { label: "Tenue noire", mots: ["tenue noire", "costume noir", "vetu de noir", "vetus de noir", "habille en noir", "habilles en noir", "en noir"] },
  { label: "Tenue professionnelle", mots: ["tenue professionnelle", "tenue exigee", "tenue correcte"] },
  { label: "Anglais", mots: ["bilingue anglais", "parle anglais", "parlant anglais", "parlent anglais", "anglais courant", "anglais"] },
  { label: "Permis requis", mots: ["permis obligatoire", "avec permis", "permis exige", "permis requis"] },
  { label: "Véhiculé", mots: ["etre vehicule", "doit etre vehicule", "vehicule obligatoire", "vehicule requis", "personne vehiculee"] },
  { label: "Certification SSIAP", mots: ["ssiap obligatoire", "ssiap requis", "ssiap exige", "ssiap"] },
  { label: "Expérience VIP", mots: ["experience vip", "connait bien les evenements vip", "connaissent bien les evenements vip", "connaissance des evenements vip"] },
  { label: "Expérience événementielle", mots: ["experience evenementielle", "experience de l'evenementiel", "experience dans l'evenementiel"] },
  { label: "Expérience en magasin", mots: ["experience en magasin", "deja travaille en magasin", "experience retail", "experience en retail"] },
  { label: "Expérience dans le luxe", mots: ["experience dans le luxe", "experience luxe"] },
  { label: "Expérience demandée", mots: ["experience obligatoire", "experience requise", "experience exigee", "experimente", "experimentee", "experimentes", "experimentees"] },
];

/** Lot C §8/§13 — un client qui assouplit sa demande ("si possible...") ne doit jamais voir sa préférence traitée comme une obligation. Marqueur cherché sur tout le segment, pas mot à mot : "si possible quelqu'un qui parle anglais" assouplit "Anglais", pas seulement le mot juste à côté de "si possible". */
const MARQUEURS_PREFERENCE = ["si possible", "dans l'ideal", "idealement", "de preference"];

function segmentEstPreference(texteNormalise: string): boolean {
  return MARQUEURS_PREFERENCE.some((m) => texteNormalise.includes(m));
}

function detecterContexte(texteNormalise: string): ContexteDetecte | null {
  const tokens = tokeniserSimple(texteNormalise);
  for (const { label, mots, certain } of CONTEXTES) {
    if (mots.some((mot) => contientMot(texteNormalise, tokens, mot))) return { label, certain };
  }
  return null;
}

function detecterContraintes(texteNormalise: string): ContrainteDetectee[] {
  const tokens = tokeniserSimple(texteNormalise);
  const niveau: NiveauContrainte = segmentEstPreference(texteNormalise) ? "prefere" : "requis";
  const trouvees: ContrainteDetectee[] = [];
  for (const { label, mots } of CONTRAINTES) {
    if (mots.some((mot) => contientMot(texteNormalise, tokens, mot))) trouvees.push({ label, niveau });
  }
  return trouvees;
}

// Lot A : ajout des noms de rôle introduits par le vocabulaire étendu
// (vigile, gardien, commercial, caissier...) — sans quoi "deux vigiles"
// détectait bien le métier mais jamais la quantité (bug pré-existant
// trouvé en testant le nouveau vocabulaire, corrigé ici car il empêche
// de valider la non-régression "quantités indépendantes" du Lot A).
const MOTS_QUANTITE =
  "agents?|hotes?|hotesses?|vendeurs?|vendeuses?|personnes?|professionnels?|" +
  "vigiles?|gardiens?|gardiennes?|commercial|commerciaux|commerciales?|caissiers?|caissieres?|commercants?|commercantes?";

function detecterQuantite(texteNormalise: string): number | null {
  const match = texteNormalise.match(new RegExp(`\\b(\\d{1,2})\\s*(${MOTS_QUANTITE})\\b`));
  if (match) return Number(match[1]);
  // "deux agents" — nombres écrits en toutes lettres, cas les plus courants seulement.
  const mots: Record<string, number> = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6 };
  const matchLettres = texteNormalise.match(
    new RegExp(`\\b(un|une|deux|trois|quatre|cinq|six)\\s+(${MOTS_QUANTITE})\\b`),
  );
  if (matchLettres) return mots[matchLettres[1]] ?? null;
  return null;
}

/**
 * Lot C §4/§14 — "quelques", "plusieurs", "une petite/grande équipe" :
 * un signal explicite qu'il en faut PLUS qu'un, mais sans chiffre
 * exploitable. Sans cette détection, l'appelant retomberait sur son
 * repli habituel "?? 1" (voir extraireBesoin/extraireSousBesoins) et
 * choisirait silencieusement 1 — aussi arbitraire que choisir 2, 3 ou
 * 5, exactement ce que le cahier interdit. Vérifié APRÈS
 * detecterQuantite : un texte qui donne déjà un chiffre explicite
 * ("quelques agents, disons 3") n'est plus incertain.
 */
const MARQUEURS_QUANTITE_VAGUE = ["quelques", "plusieurs", "petite equipe", "grande equipe", "une equipe"];

function quantiteEstVague(texteNormalise: string): boolean {
  return MARQUEURS_QUANTITE_VAGUE.some((m) => texteNormalise.includes(m));
}

export type AdresseDetectee = {
  /** Texte complet de l'adresse tel qu'écrit par le client (casse/accents d'origine), pour affichage direct. */
  texte: string;
  /** Ville devinée si un code postal ou un nom de ville suit immédiatement — simple indice pour préremplir
   * l'autocomplete villes IDF (geo.api.gouv.fr), jamais une vérité en soi : le client confirme toujours. */
  villeDevinee: string | null;
  /**
   * Lot C §1 — fiabilité du signal qui a produit villeDevinee : "certaine"
   * quand un code postal accompagne le nom de ville (numéro à 5 chiffres +
   * ville, un signal fort qui ne laisse guère de place au doute) ;
   * "probable" quand la ville n'est devinée que par une préposition suivant
   * l'adresse ("... à Paris", sans code postal) — dans ce cas TOUJOURS
   * proposée avec confirmation avant d'être retenue (besoin-capture.tsx),
   * jamais silencieusement appliquée. null si villeDevinee est null.
   */
  villeCertitude: "certaine" | "probable" | null;
};

const TYPES_VOIE =
  "rue|avenue|av\\.?|boulevard|bd\\.?|place|allee|allée|impasse|chemin|quai|square|villa|passage|cours|esplanade";

/**
 * Mots qui arrêtent la capture d'un nom de voie/ville dès qu'ils
 * apparaissent — volontairement restreint aux mots qui signalent sans
 * ambiguïté "l'adresse est terminée" (jours, moments, "à"/"sur" comme
 * préposition de lieu suivante). PAS "et"/"de"/"la"/"le" : ces mots
 * apparaissent légitimement dans de vrais noms de voie français
 * ("rue Robert et Sonia Delaunay", "avenue de la Paix").
 */
const MOTS_ARRET = new Set([
  "a", "à", "sur",
  "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche",
  "matin", "soir", "midi", "minuit", "demain", "aujourd'hui", "aujourdhui",
]);

/** Ne garde, dans une suite de mots capturée trop largement par la regex, que le préfixe avant le premier mot d'arrêt. */
function tronquerAuMotArret(texte: string): string {
  const mots = texte.trim().split(/\s+/);
  const limite = mots.findIndex((m) => MOTS_ARRET.has(m.toLowerCase().replace(/[.,;]+$/, "")));
  return (limite === -1 ? mots : mots.slice(0, limite)).join(" ").trim();
}

/**
 * Détecte une adresse au niveau de la rue (pas juste une ville) quand
 * le client en donne une explicitement — ex. "21 rue Robert et Sonia
 * Delaunay, 75011 Paris". Opère sur le texte ORIGINAL (pas normalisé)
 * pour préserver la casse/les accents à l'affichage ; contrairement à
 * `ville` (jamais extraite du texte libre, laissée à l'autocomplete),
 * une adresse de rue a un motif assez distinctif (numéro + type de
 * voie) pour être détectée sans faux positifs. La capture du nom de
 * voie est volontairement large puis tronquée au premier mot d'arrêt
 * (jour, moment, préposition) plutôt que réglée finement par regex —
 * "avenue des Champs-Élysées à Paris lundi..." doit s'arrêter avant "à".
 */
export function detecterAdresse(texteOriginal: string): AdresseDetectee | null {
  const motifVoie = new RegExp(`\\b(\\d{1,4}(?:\\s*(?:bis|ter))?)\\s+(${TYPES_VOIE})\\s+([^,.;\\n]+?)(?=[,.;\\n]|\\s+\\d{5}|$)`, "i");
  const match = texteOriginal.match(motifVoie);
  if (!match || match.index === undefined) return null;

  const nomVoie = tronquerAuMotArret(match[3]);
  if (!nomVoie) return null;
  let texte = `${match[1]} ${match[2]} ${nomVoie}`.trim();
  let villeDevinee: string | null = null;
  let villeCertitude: "certaine" | "probable" | null = null;

  // La regex capture le nom de voie de façon large (jusqu'à la
  // ponctuation ou la fin) ; nomVoie n'en est qu'un préfixe tronqué au
  // premier mot d'arrêt. On calcule donc la fin réelle à partir de la
  // position de ce préfixe dans le texte d'origine, pas de match[0]
  // (sinon "suite" pointerait après "lundi de 9h à 17h" au lieu de
  // juste après "Champs-Élysées", ratant le "à Paris" intermédiaire).
  const debutNomVoie = match.index + match[0].indexOf(match[3]);
  const finMatch = debutNomVoie + nomVoie.length;
  const suite = texteOriginal.slice(finMatch, finMatch + 60);
  const suiteCodePostal = suite.match(/^[,\s]+(\d{5})\s*([a-zà-öø-ÿ][a-zà-öø-ÿ'’-]*(?:\s+[a-zà-öø-ÿ][a-zà-öø-ÿ'’-]*){0,2})?/i);
  if (suiteCodePostal) {
    const villeBrute = suiteCodePostal[2] ? tronquerAuMotArret(suiteCodePostal[2]) : null;
    texte += `, ${suiteCodePostal[1]}${villeBrute ? ` ${villeBrute}` : ""}`;
    villeDevinee = villeBrute || null;
    // Code postal + nom de ville explicite ensemble : signal fort (Lot C §1).
    villeCertitude = villeDevinee ? "certaine" : null;
  } else {
    // "à Paris" / "sur Paris" juste après l'adresse, sans code postal —
    // seulement une préposition, jamais aussi fiable qu'un code postal.
    const suiteVille = suite.match(/^[,\s]*(?:a|à|sur)\s+([a-zà-öø-ÿ][a-zà-öø-ÿ'’-]*(?:[- ][a-zà-öø-ÿ][a-zà-öø-ÿ'’-]*){0,2})/i);
    if (suiteVille) villeDevinee = tronquerAuMotArret(suiteVille[1]) || null;
    villeCertitude = villeDevinee ? "probable" : null;
  }

  return { texte, villeDevinee, villeCertitude };
}

/**
 * Lot D §9 — un arrondissement parisien cité sans adresse de rue
 * ("dans le 8e", "8ème arrondissement") : un signal de ville réel dans
 * le contexte Île-de-France de ProParJour, mais jamais aussi certain
 * qu'un code postal explicite — toujours "probable" (même traitement
 * que villeCertitude "probable" plus haut), jamais appliqué en
 * silence. Restreint aux formulations explicites ("dans le Ne",
 * "Ne arrondissement") pour ne jamais confondre avec un ordinal
 * sans rapport ("2e agent").
 */
export function detecterArrondissement(texteOriginal: string): string | null {
  const match = texteOriginal.match(
    /\bdans\s+le\s+(\d{1,2})\s*(?:e|eme|ème|er)\b|\b(\d{1,2})\s*(?:e|eme|ème)\s*arrondissement\b/i,
  );
  if (!match) return null;
  const n = Number(match[1] ?? match[2]);
  if (n < 1 || n > 20) return null;
  return "Paris";
}

const JOURS_SEMAINE = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

const MOIS = [
  "janvier", "fevrier", "mars", "avril", "mai", "juin",
  "juillet", "aout", "septembre", "octobre", "novembre", "decembre",
];

function prochainJour(nomJour: string, depuis: Date): Date {
  const cible = JOURS_SEMAINE.indexOf(nomJour);
  const date = new Date(depuis);
  let delta = (cible - date.getDay() + 7) % 7;
  if (delta === 0) delta = 7; // "vendredi" dit un lundi = le vendredi suivant, pas aujourd'hui
  date.setDate(date.getDate() + delta);
  return date;
}

/**
 * Prochaine occurrence future (>= depuis) où le quantième ET le jour
 * de semaine cité correspondent réellement (ex. "vendredi 18" : ne
 * renvoie le 18 d'un mois que si ce 18-là tombe un vendredi — sinon
 * cherche le mois suivant, jusqu'à 6 mois, plutôt que d'inventer une
 * date qui ne respecte pas le jour de semaine annoncé).
 */
function prochaineOccurrenceJourDuMois(nomJour: string, jourDuMois: number, depuis: Date): Date | null {
  if (jourDuMois < 1 || jourDuMois > 31) return null;
  const cibleJourSemaine = JOURS_SEMAINE.indexOf(nomJour);
  const depuisSansHeure = new Date(depuis.getFullYear(), depuis.getMonth(), depuis.getDate());
  for (let decalageMois = 0; decalageMois <= 6; decalageMois++) {
    const candidate = new Date(depuis.getFullYear(), depuis.getMonth() + decalageMois, jourDuMois);
    if (candidate.getDate() !== jourDuMois) continue; // ex. 31 février → invalide, on saute ce mois
    if (candidate.getDay() !== cibleJourSemaine) continue; // le quantième ne tombe pas sur le bon jour ce mois-ci
    if (candidate >= depuisSansHeure) return candidate;
  }
  return null;
}

/** Formate en ISO yyyy-mm-dd à partir des composants LOCAUX du Date — jamais via toISOString() (bascule en UTC, décale d'un jour selon le fuseau serveur autour de minuit). */
function iso(d: Date): string {
  const annee = d.getFullYear();
  const mois = String(d.getMonth() + 1).padStart(2, "0");
  const jour = String(d.getDate()).padStart(2, "0");
  return `${annee}-${mois}-${jour}`;
}

/**
 * Détection de date volontairement large mais jamais inventée : ne
 * renvoie une date que si un mot-clé sans ambiguïté a été trouvé.
 * "du 20 au 22 août" retient le 20 (début) — pas de modélisation de
 * plage, une seule date par sous-besoin dans ce schéma (cahier §3).
 */
function detecterDate(texteNormalise: string, maintenant: Date): string | null {
  if (/\baujourd'?hui\b/.test(texteNormalise)) {
    return iso(maintenant);
  }
  // Lot D — "ce soir" signifie aujourd'hui, exactement comme
  // "aujourd'hui" ; sans cette entrée, la date restait absente alors
  // que l'expression est aussi ferme que "aujourd'hui".
  if (/\bce\s+soir\b/.test(texteNormalise)) {
    return iso(maintenant);
  }
  // "après-demain" AVANT "demain" : "apres-demain" contient "demain"
  // avec une frontière de mot valide après le tiret, donc \bdemain\b
  // matcherait aussi dedans si on testait "demain" en premier.
  if (/\bapres[- ]demain\b/.test(texteNormalise)) {
    const d = new Date(maintenant);
    d.setDate(d.getDate() + 2);
    return iso(d);
  }
  if (/\bdemain\b/.test(texteNormalise)) {
    const d = new Date(maintenant);
    d.setDate(d.getDate() + 1);
    return iso(d);
  }
  // "20/08", "20-08", "20/08/2026" — jour/mois en premier (usage français), année optionnelle.
  const numerique = texteNormalise.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (numerique) {
    const jour = Number(numerique[1]);
    const mois = Number(numerique[2]) - 1;
    if (jour >= 1 && jour <= 31 && mois >= 0 && mois <= 11) {
      const annee = numerique[3] ? (numerique[3].length === 2 ? 2000 + Number(numerique[3]) : Number(numerique[3])) : maintenant.getFullYear();
      const d = new Date(annee, mois, jour);
      if (!numerique[3] && d < new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate())) {
        d.setFullYear(annee + 1); // "20/08" déjà passé cette année → l'année prochaine
      }
      return iso(d);
    }
  }
  // "20 août", "le 20 août", "du 20 au 22 août" (on ne garde que le
  // premier quantième — le début, jamais la fin). Vérifiée EN PREMIER,
  // sinon "du 12 au 14 septembre" ne contient "N septembre" que pour
  // le second nombre ("14 septembre" est collé au mot du mois, "12"
  // ne l'est pas) et la boucle générique juste en dessous retiendrait
  // par erreur la fin de la période plutôt que le début (bug trouvé au
  // Lot D, jamais volontaire malgré ce que documentait déjà ce fichier).
  for (let i = 0; i < MOIS.length; i++) {
    const motPlage = new RegExp(`\\bdu\\s+(\\d{1,2})\\s+au\\s+\\d{1,2}\\s+${MOIS[i]}\\b`);
    const matchPlage = texteNormalise.match(motPlage);
    if (matchPlage) {
      const jour = Number(matchPlage[1]);
      if (jour < 1 || jour > 31) continue;
      const d = new Date(maintenant.getFullYear(), i, jour);
      if (d < new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate())) {
        d.setFullYear(maintenant.getFullYear() + 1);
      }
      return iso(d);
    }
  }
  for (let i = 0; i < MOIS.length; i++) {
    const motMois = new RegExp(`\\b(\\d{1,2})\\s+${MOIS[i]}\\b`);
    const match = texteNormalise.match(motMois);
    if (match) {
      const jour = Number(match[1]);
      if (jour < 1 || jour > 31) continue;
      const d = new Date(maintenant.getFullYear(), i, jour);
      if (d < new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate())) {
        d.setFullYear(maintenant.getFullYear() + 1);
      }
      return iso(d);
    }
  }
  // "vendredi 18" — jour de semaine suivi d'un quantième, sans mois explicite.
  for (const jour of JOURS_SEMAINE) {
    const avecQuantieme = texteNormalise.match(new RegExp(`\\b${jour}\\s+(\\d{1,2})\\b`));
    if (avecQuantieme) {
      const d = prochaineOccurrenceJourDuMois(jour, Number(avecQuantieme[1]), maintenant);
      if (d) return iso(d);
    }
  }
  if (/\bce\s+week-?end\b/.test(texteNormalise)) {
    return iso(prochainJour("samedi", maintenant));
  }
  for (const jour of JOURS_SEMAINE) {
    if (texteNormalise.includes(jour)) {
      return iso(prochainJour(jour, maintenant));
    }
  }
  return null;
}

const MOMENTS: { motif: RegExp; moment: MomentJournee }[] = [
  { motif: /\bce\s+matin\b|\bmatin\b/, moment: "matin" },
  { motif: /\bapres[- ]midi\b/, moment: "apres-midi" },
  // Lot C : "soiree" ajouté à côté de "soir" — "en soirée" (forme la
  // plus naturelle à l'écrit, cahier §3) ne matchait pas \bsoir\b, la
  // frontière de mot ne coupant jamais entre "soir" et son "-ée" final.
  { motif: /\b(ce\s+soir|soir|soiree)\b/, moment: "soir" },
  { motif: /\bnuit\b/, moment: "nuit" },
];

/** Indice de moment de journée quand aucune heure exacte n'a pu être détectée — jamais converti en horaire chiffré. */
function detecterMoment(texteNormalise: string): MomentJournee | null {
  for (const { motif, moment } of MOMENTS) {
    if (motif.test(texteNormalise)) return moment;
  }
  return null;
}

function heure(h: string, m: string | undefined): string {
  return `${h.padStart(2, "0")}:${(m ?? "00").padStart(2, "0")}`;
}

function detecterHoraires(texteNormalise: string): { debut: string | null; fin: string | null } {
  // "18h-00h", "18h à 23h30", "de 9h à 17h"
  const plage = texteNormalise.match(/(\d{1,2})h(\d{2})?\s*(?:-|a|jusqu'?a)\s*(\d{1,2})h(\d{2})?/);
  if (plage) {
    return { debut: heure(plage[1], plage[2]), fin: heure(plage[3], plage[4]) };
  }
  if (/\bminuit\b/.test(texteNormalise)) {
    const seul = texteNormalise.match(/(\d{1,2})h(\d{2})?\s*(?:-|a|jusqu'?a)\s*minuit/);
    if (seul) return { debut: heure(seul[1], seul[2]), fin: "00:00" };
  }
  // Lot D — "jusqu'à Xh"/"jusqu'à minuit" SEULS (sans heure de début
  // énoncée) : vérifiés AVANT le repli générique "à Xh" juste en
  // dessous, sinon son alternative "a" nue matchait par erreur le "a"
  // collé dans "jusqu'a" (frontière de mot valide juste après
  // l'apostrophe) et transformait à tort "jusqu'à 23h" en un DÉBUT à
  // 23h plutôt qu'une FIN à 23h — bug trouvé en testant ce cas précis.
  if (/\bminuit\b/.test(texteNormalise) && !/(\d{1,2})h(\d{2})?\s*(?:-|a|jusqu'?a)\s*minuit/.test(texteNormalise)) {
    return { debut: null, fin: "00:00" };
  }
  const finSeule = texteNormalise.match(/\bjusqu'?a\s*(\d{1,2})h(\d{2})?\b/);
  if (finSeule) return { debut: null, fin: heure(finSeule[1], finSeule[2]) };
  // "à 18h", "des 18h", "à partir de 18h" — une seule heure de début, sans fin précisée.
  const seule = texteNormalise.match(/\b(?:a partir de|a|des)\s*(\d{1,2})h(\d{2})?\b/);
  if (seule) return { debut: heure(seule[1], seule[2]), fin: null };
  return { debut: null, fin: null };
}

/**
 * Lot C §2/§13 — mots qui rendent une date PAR AILLEURS résolue par
 * detecterDate probable plutôt que certaine (jamais appliqués en
 * silence). "vendredi PROCHAIN" est une vraie ambiguïté du français
 * (le vendredi de cette semaine ou de la suivante, selon la personne) ;
 * "environ"/"vers le"/"autour du" qualifient une date par ailleurs
 * précise ("autour du 20 août").
 */
const MARQUEURS_DATE_APPROXIMATIVE = ["prochain", "prochaine", "environ", "vers le", "autour du", "aux alentours du"];

function dateEstApproximative(texteNormalise: string): boolean {
  return MARQUEURS_DATE_APPROXIMATIVE.some((m) => texteNormalise.includes(m));
}

/** Lot D §3 — "entre lundi et mercredi" : detecterDate retient déjà "lundi" (premier jour cité) via son repli générique, mais silencieusement — un intervalle explicite n'est jamais aussi ferme qu'un seul jour cité. */
function texteEstPlageJours(texteNormalise: string): boolean {
  return /\bentre\s+(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+et\s+(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/.test(
    texteNormalise,
  );
}

/**
 * Lot D §3/§7 — "tous les vendredis", "chaque semaine", "une fois par
 * mois" : detecterDate retient déjà le premier jour cité, mais un
 * marqueur de récurrence signale une mission qui REVIENT — jamais
 * construit ici (le système de séries reste au Lot 7, cahier §7),
 * seulement signalé pour que le client sache qu'une seule occurrence a
 * été retenue plutôt que de croire la récurrence comprise à tort.
 */
function texteEstRecurrent(texteNormalise: string): boolean {
  return /\btous les (lundis|mardis|mercredis|jeudis|vendredis|samedis|dimanches)\b|\bchaque semaine\b|\bune fois par (semaine|mois)\b/.test(
    texteNormalise,
  );
}

/** Formulations qui appellent clairement une date sans qu'aucun jour/quantième n'en permette même une estimation raisonnable — question ouverte, jamais de valeur inventée (cahier §2, §14). */
function dateSansCandidat(texteNormalise: string): boolean {
  return /\bsemaine prochaine\b/.test(texteNormalise);
}

/**
 * "vers le 15", "autour du 20" (SANS mois, contrairement à "autour du
 * 20 août" déjà couvert par detecterDate) — une seule interprétation
 * raisonnable existe (la prochaine fois que ce quantième arrive), mais
 * jamais retenue sans confirmation explicite (voir dateEstApproximative
 * pour son pendant "avec mois").
 */
function detecterQuantiemeApproximatif(texteNormalise: string, maintenant: Date): Date | null {
  const match = texteNormalise.match(/\b(?:vers le|autour du|aux alentours du)\s+(\d{1,2})\b/);
  if (!match) return null;
  const jour = Number(match[1]);
  if (jour < 1 || jour > 31) return null;
  const aujourdhuiSansHeure = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());
  for (let decalageMois = 0; decalageMois <= 2; decalageMois++) {
    const candidat = new Date(maintenant.getFullYear(), maintenant.getMonth() + decalageMois, jour);
    if (candidat.getDate() !== jour) continue; // ex. jour 31 dans un mois qui n'en a pas
    if (candidat >= aujourdhuiSansHeure) return candidat;
  }
  return null;
}

/**
 * Combine detecterDate (inchangé) avec les cas Lot C : une date déjà
 * certaine reste certaine sauf marqueur d'approximation détecté ; à
 * défaut, un quantième approximatif ("vers le 15") ou "en fin de
 * semaine" (repli sur le prochain samedi, jamais aussi ferme que "ce
 * week-end") fournissent une proposition ; sinon, si le texte appelle
 * clairement une date sans qu'aucune ne soit devinable, la question
 * reste ouverte plutôt que silencieuse.
 */
function resoudreDate(texteNormalise: string, maintenant: Date): { date: string | null; ambiguites: Ambiguite[]; incertaine: boolean } {
  const dateCertaine = detecterDate(texteNormalise, maintenant);
  if (dateCertaine) {
    if (texteEstRecurrent(texteNormalise)) {
      return {
        date: dateCertaine,
        ambiguites: [{ champ: "date", propose: dateCertaine, question: "Cette mission semble se répéter — nous n'avons retenu que la première date." }],
        incertaine: false,
      };
    }
    if (texteEstPlageJours(texteNormalise)) {
      return {
        date: dateCertaine,
        ambiguites: [{ champ: "date", propose: dateCertaine, question: "Vous avez cité une plage de jours — nous avons retenu le premier." }],
        incertaine: false,
      };
    }
    if (dateEstApproximative(texteNormalise)) {
      return {
        date: dateCertaine,
        ambiguites: [{ champ: "date", propose: dateCertaine, question: "Nous avons compris cette date, mais la formulation reste approximative." }],
        incertaine: false,
      };
    }
    return { date: dateCertaine, ambiguites: [], incertaine: false };
  }
  const quantiemeApprox = detecterQuantiemeApproximatif(texteNormalise, maintenant);
  if (quantiemeApprox) {
    const d = iso(quantiemeApprox);
    return { date: d, ambiguites: [{ champ: "date", propose: d, question: "Nous avons estimé cette date à partir du jour du mois indiqué." }], incertaine: false };
  }
  if (/\ben fin de semaine\b|\ble week-?end prochain\b/.test(texteNormalise)) {
    const d = iso(prochainJour("samedi", maintenant));
    return { date: d, ambiguites: [{ champ: "date", propose: d, question: "Nous avons compris ce samedi." }], incertaine: false };
  }
  if (dateSansCandidat(texteNormalise)) {
    return { date: null, ambiguites: [], incertaine: true };
  }
  return { date: null, ambiguites: [], incertaine: false };
}

/** Lot C §3 — pendant de dateEstApproximative pour les horaires ("jusqu'à minuit ENVIRON") : un horaire par ailleurs résolu reste proposé, jamais assimilé à une heure certaine. */
function horaireEstApproximatif(texteNormalise: string): boolean {
  return /\benviron\b/.test(texteNormalise);
}

/** "vers 20h", "aux alentours de 20h" — une heure isolée, approximative par construction : jamais confondue avec une heure certaine (cahier §3). */
function detecterHeureApproximative(texteNormalise: string): string | null {
  const match = texteNormalise.match(/\b(?:vers|aux alentours de|autour de)\s*(\d{1,2})h(\d{2})?\b/);
  return match ? heure(match[1], match[2]) : null;
}

/** Combine detecterHoraires (inchangé) avec les cas Lot C — même logique que resoudreDate. */
function resoudreHoraires(texteNormalise: string): { debut: string | null; fin: string | null; ambiguites: Ambiguite[] } {
  const h = detecterHoraires(texteNormalise);
  if (h.debut || h.fin) {
    if (horaireEstApproximatif(texteNormalise)) {
      const propose = h.debut && h.fin ? `${h.debut}-${h.fin}` : (h.debut ?? h.fin ?? "");
      return { ...h, ambiguites: [{ champ: "horaires", propose, question: "Cet horaire semble approximatif (\"environ\")." }] };
    }
    return { ...h, ambiguites: [] };
  }
  const approx = detecterHeureApproximative(texteNormalise);
  if (approx) {
    return { debut: approx, fin: null, ambiguites: [{ champ: "horaires", propose: approx, question: "Nous avons compris une heure approximative." }] };
  }
  return { debut: null, fin: null, ambiguites: [] };
}

export function extraireBesoin(texte: string, maintenant: Date = new Date()): BesoinExtrait {
  const normalise = normaliser(texte);
  const horaires = resoudreHoraires(normalise);
  const date = resoudreDate(normalise, maintenant);
  const quantite = detecterQuantite(normalise);
  // "quelques agents, disons 3" : un chiffre explicite l'emporte
  // toujours sur un marqueur vague qui traînerait par ailleurs dans la
  // phrase — l'incertitude ne s'applique que si AUCUN chiffre n'a pu
  // être extrait (cahier §4/§14 : ne jamais choisir arbitrairement).
  const quantiteIncertaine = quantite === null && quantiteEstVague(normalise);
  return {
    metier: detecterMetier(normalise),
    ville: null, // laissé au champ dédié (autocomplete villes IDF) — trop peu fiable à extraire du texte libre
    quantite,
    date: date.date,
    heureDebut: horaires.debut,
    heureFin: horaires.fin,
    moment: horaires.debut === null ? detecterMoment(normalise) : null,
    // Un seul métier ici (ou aucun) : le texte entier lui appartient
    // sans ambiguïté, contrairement à SousBesoin.contraintes qui reste
    // local à son segment dans une décomposition multi-métiers.
    contexte: detecterContexte(normalise),
    contraintes: detecterContraintes(normalise),
    ambiguites: [...date.ambiguites, ...horaires.ambiguites],
    quantiteIncertaine,
    dateIncertaine: date.incertaine,
  };
}

export type SousBesoin = {
  metier: MetierId;
  quantite: number;
  // Horaires propres à ce métier quand le texte les précise
  // séparément (ex. "2 agents de 18h à minuit... une hôtesse de 18h
  // à 23h") — null si non détectés dans le segment, auquel cas
  // l'appelant retombe sur l'horaire global de la demande.
  heureDebut: string | null;
  heureFin: string | null;
  // Idem pour la date : propre au sous-besoin si le texte la répète
  // localement ("...et lundi une hôtesse"), sinon repli sur la date
  // globale détectée en tête de phrase ("Pour dimanche, ...") — jamais
  // la même date appliquée par erreur à tous les métiers quand le
  // texte en donne plusieurs (cahier §3).
  date: string | null;
  // Indice de moment de journée quand aucune heure exacte n'a été
  // détectée dans le segment ("...une hôtesse lundi soir") — jamais
  // converti en horaire inventé.
  moment: MomentJournee | null;
  // Lot B — contexte : un seul par sous-besoin, résolu au moment de
  // l'extraction (local au segment si le texte le répète, sinon repli
  // sur le contexte "de tête" partagé par toute la demande — même
  // logique que la date globale juste au-dessus). Jamais réévalué
  // après coup, mais librement modifiable/supprimable ensuite dans
  // l'écran de vérification (besoin-capture.tsx).
  contexte: ContexteDetecte | null;
  // Contraintes : strictement locales au segment, JAMAIS de repli sur
  // un contexte partagé — contrairement à date/contexte, une
  // contrainte ("tenue noire") qui n'est pas répétée dans le segment
  // d'un métier ne doit jamais lui être attribuée par erreur (cahier
  // §4 : "ne jamais mélanger les contraintes entre métiers").
  contraintes: ContrainteDetectee[];
  // Lot C — même principe que sur BesoinExtrait : date/heureDebut/
  // heureFin restent préremplis dès qu'une valeur (même approximative)
  // est disponible, ambiguites porte seulement le signal "à confirmer".
  ambiguites: Ambiguite[];
  quantiteIncertaine: boolean;
  dateIncertaine: boolean;
  // Lot D §7 — plusieurs jours cités explicitement pour ce même métier
  // ("lundi, mardi et mercredi") : `date` reste résolue au premier
  // (aucun flux existant — recherche, publication, matching — n'a
  // besoin de changer), ce tableau porte les autres en plus, à titre
  // strictement informatif. Ne construit jamais de mission récurrente
  // (le système de séries du Lot 7 reste seul responsable de ça) —
  // seulement porté à la connaissance du client pour qu'il sache que
  // plusieurs jours ont été compris, jamais réduits en silence à un seul.
  datesMultiples: string[] | null;
};

/** Lot D §7 — plusieurs jours de semaine cités pour un même segment ("lundi, mardi et mercredi") : calculés dans la MÊME semaine que la date déjà résolue pour ce segment (jamais indépendamment via prochainJour, qui pousserait à tort un jour déjà résolu vers la semaine suivante si "maintenant" tombe justement ce jour-là — voir prochainJour, delta=0→+7). */
function detecterDatesMultiples(texteNormalise: string, dateAncrage: string | null): string[] | null {
  if (!dateAncrage) return null;
  const joursTrouves = JOURS_SEMAINE.filter((jour) => new RegExp(`\\b${jour}\\b`).test(texteNormalise));
  if (joursTrouves.length < 2) return null;
  const ancrage = new Date(`${dateAncrage}T00:00:00`);
  const indexAncrage = ancrage.getDay();
  const dates = joursTrouves.map((jour) => {
    const delta = (JOURS_SEMAINE.indexOf(jour) - indexAncrage + 7) % 7;
    const d = new Date(ancrage);
    d.setDate(d.getDate() + delta);
    return iso(d);
  });
  return dates.sort();
}

/**
 * Lot D §2 — un rappel explicite en début de phrase ("Les agents
 * doivent...", "L'hôtesse doit...") après avoir déjà cité un AUTRE
 * métier : la segmentation positionnelle attribuerait cette phrase au
 * dernier métier cité (celui dont le segment l'englobe), pas à celui
 * qu'elle désigne. Volontairement restreint au DÉBUT d'une phrase
 * (jamais au milieu) pour limiter le risque de faux positif.
 */
const MOTS_RAPPEL_METIER: Record<MetierId, string[]> = {
  securite: ["agents", "agent", "vigiles", "vigile", "gardiens", "gardien"],
  accueil: ["hotesses", "hotesse", "hotes", "hote"],
  vente: ["vendeurs", "vendeuses", "vendeuse", "vendeur"],
};

function detecterRappelsMetier(texteNormalise: string): { metier: MetierId; segment: string }[] {
  const phrases = texteNormalise.split(/(?<=\.)\s+/);
  const rappels: { metier: MetierId; segment: string }[] = [];
  for (const phrase of phrases) {
    const match = phrase.match(/^(?:les|le|la|l')\s+([a-z]+)\b/);
    if (!match) continue;
    for (const [metier, mots] of Object.entries(MOTS_RAPPEL_METIER) as [MetierId, string[]][]) {
      if (mots.includes(match[1])) {
        rappels.push({ metier, segment: phrase });
        break;
      }
    }
  }
  return rappels;
}

/**
 * Redirige les contraintes d'une phrase de rappel vers le bon métier,
 * en les retirant d'où la segmentation positionnelle les aurait
 * attribuées à tort (le sous-besoin dont le segment contient
 * textuellement cette phrase) — jamais dupliquées, jamais laissées aux
 * deux endroits à la fois. Mute `sousBesoins` en place (tableau déjà
 * possédé par l'appelant, jamais partagé).
 */
function reattribuerRappels(sousBesoins: SousBesoin[], texteNormalise: string): void {
  for (const rappel of detecterRappelsMetier(texteNormalise)) {
    const cible = sousBesoins.find((s) => s.metier === rappel.metier);
    if (!cible) continue;
    const contraintesRappel = detecterContraintes(rappel.segment);
    if (contraintesRappel.length === 0) continue;
    for (const autre of sousBesoins) {
      if (autre === cible) continue;
      autre.contraintes = autre.contraintes.filter((c) => !contraintesRappel.some((cr) => cr.label === c.label));
    }
    for (const c of contraintesRappel) {
      if (!cible.contraintes.some((x) => x.label === c.label)) cible.contraintes.push(c);
    }
  }
}

/**
 * Lot D §6 — "et {jour}" comme frontière de mission supplémentaire :
 * quand la date/l'horaire d'un DEUXIÈME métier est cité AVANT son
 * propre mot-clé ("...deux agents... et samedi de 10h à 18h de trois
 * vendeurs"), la segmentation positionnelle pure les attribuerait à
 * tort au métier précédent (dont le segment s'étend jusqu'au mot-clé
 * suivant). Un "et" immédiatement suivi d'un jour de semaine est un
 * signal net d'un nouveau sous-besoin qui commence — jamais confondu
 * avec la construction "...et un vendeur..."/"...et une hôtesse..."
 * (déjà couverte, sans "et {jour}") du scénario de référence Lots A/B.
 */
const MOTIF_ET_JOUR = /\bet\s+(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/;

/**
 * Décompose un texte qui mélange plusieurs métiers (ex. "deux agents
 * de sécurité, une hôtesse et un vendeur") en sous-besoins
 * indépendants, un par métier détecté, chacun avec sa propre
 * quantité et ses propres horaires si précisés. Découpe le texte en
 * segments délimités par la position de chaque métier puis réutilise
 * detecterQuantite/detecterHoraires sur chaque segment — évite qu'un
 * nombre ou un horaire associé à un métier soit attribué au mauvais
 * métier voisin. Retourne un tableau vide si aucun métier n'est
 * détecté, ou un seul élément si un seul métier est mentionné
 * (quantité par défaut 1 si non précisée).
 */
export function extraireSousBesoins(texte: string, maintenant: Date = new Date()): SousBesoin[] {
  const normalise = normaliser(texte);
  const positions = detecterMetiersAvecPosition(normalise);
  if (positions.length === 0) return [];
  // Date "de tête" (ex. "Pour dimanche, ...") — sert de repli pour tout
  // sous-besoin dont le segment local ne répète pas sa propre date ;
  // résolue avec la même logique certain/probable que le reste (Lot C),
  // pour que l'ambiguïté éventuelle de la date de tête se propage à
  // chaque sous-besoin qui s'y replie plutôt que d'être silencieusement perdue.
  const dateGlobaleResolue = resoudreDate(normalise, maintenant);
  // Contexte "de tête" (ex. "Pour une soirée VIP, ..." avant même le
  // premier métier cité) — même repli que la date, PARTAGÉ par tous
  // les sous-besoins car il décrit l'événement dans son ensemble, pas
  // un métier en particulier (cahier Lot B, exemple de référence).
  const contexteGlobal = detecterContexte(normalise);
  if (positions.length === 1) {
    const horaires = resoudreHoraires(normalise);
    const quantite = detecterQuantite(normalise);
    return [
      {
        metier: positions[0].metier,
        quantite: quantite ?? 1,
        heureDebut: horaires.debut,
        heureFin: horaires.fin,
        date: dateGlobaleResolue.date,
        moment: horaires.debut === null ? detecterMoment(normalise) : null,
        // Un seul métier dans toute la demande : texte entier sans ambiguïté.
        contexte: contexteGlobal,
        contraintes: detecterContraintes(normalise),
        ambiguites: [...dateGlobaleResolue.ambiguites, ...horaires.ambiguites],
        quantiteIncertaine: quantite === null && quantiteEstVague(normalise),
        dateIncertaine: dateGlobaleResolue.incertaine,
        datesMultiples: detecterDatesMultiples(normalise, dateGlobaleResolue.date),
      },
    ];
  }
  // Lot D §6/§13 — repli horaires "de tête", même principe que
  // dateGlobaleResolue déjà existant : un horaire énoncé avant TOUT
  // métier ("Vendredi de 18h à 22h, il me faut un vendeur...") ne
  // tombe dans aucun segment local (les segments démarrent à chaque
  // mot-clé métier) ; sans ce repli, il était perdu pour le premier
  // métier cité alors que la date, elle, le récupérait déjà. Cherché
  // UNIQUEMENT dans le texte AVANT le premier métier cité — jamais sur
  // le texte entier, qui peut contenir l'horaire d'une AUTRE mission
  // plus loin (cahier §6 : "vendredi... 18h à minuit... et samedi de
  // 10h à 18h...", où une recherche sur tout le texte retiendrait à
  // tort l'horaire de samedi pour la mission de vendredi).
  const horairesGlobalesResolues = resoudreHoraires(normalise.slice(0, positions[0].index));
  const resultat = positions.map((p, i) => {
    const debutQuantite = i === 0 ? 0 : positions[i - 1].index;
    const finSegment = i === positions.length - 1 ? normalise.length : positions[i + 1].index;
    // La quantité précède souvent le mot-clé métier ("deux agents de
    // sécurité") : segment large, depuis le métier précédent. Les
    // horaires et la date, eux, suivent toujours le métier auquel ils
    // s'appliquent ("...une hôtesse de 18h à 23h" / "...et lundi une
    // hôtesse") — un segment démarrant avant le métier courant
    // capterait par erreur les horaires/la date du métier précédent
    // (voir le cas "sécurité 18h-minuit, hôtesse 18h-23h, vendeur
    // 19h-23h" où le segment large aurait fait hériter "vendeur" des
    // horaires de "hôtesse").
    const segmentQuantite = normalise.slice(debutQuantite, finSegment);
    const segmentLocalBrut = normalise.slice(p.index, finSegment);
    // "et {jour}" DANS ce segment : tout ce qui suit décrit
    // probablement la mission suivante (un autre jour), pas celle-ci —
    // on arrête le segment juste avant (voir MOTIF_ET_JOUR).
    const marqueurAvant = MOTIF_ET_JOUR.exec(segmentLocalBrut);
    const segmentLocal = marqueurAvant ? segmentLocalBrut.slice(0, marqueurAvant.index) : segmentLocalBrut;
    // "et {jour}" dans la fenêtre PRÉCÉDENTE (entre le métier
    // précédent et celui-ci) : si ce métier-ci n'a rien dans son
    // propre segment, la date/l'horaire qui suit ce marqueur lui
    // appartient — cité avant son propre mot-clé plutôt qu'après.
    // UNIQUEMENT pour i > 0 : le tout premier métier n'a pas de
    // "fenêtre précédente" — sans cette garde, segmentQuantite pour
    // i=0 s'étend depuis le tout début du texte et capterait à tort le
    // "et {jour}" d'un métier suivant, bien plus loin (le repli
    // habituel dateGlobaleResolue/horairesGlobalesResolues suffit déjà
    // pour ce qui précède le premier métier cité).
    const marqueurRetour = i > 0 ? [...segmentQuantite.matchAll(new RegExp(MOTIF_ET_JOUR, "g"))].pop() : undefined;
    const segmentEtendu = marqueurRetour?.index !== undefined ? segmentQuantite.slice(marqueurRetour.index) : null;

    const horairesLocal = resoudreHoraires(segmentLocal);
    const horaires =
      horairesLocal.debut || horairesLocal.fin || !segmentEtendu ? horairesLocal : resoudreHoraires(segmentEtendu);
    const heureDebutFinal = horaires.debut ?? horairesGlobalesResolues.debut;
    const heureFinFinal = horaires.fin ?? horairesGlobalesResolues.fin;
    const ambiguiteHoraire =
      horaires.debut || horaires.fin
        ? horaires.ambiguites
        : horairesGlobalesResolues.debut || horairesGlobalesResolues.fin
          ? horairesGlobalesResolues.ambiguites
          : [];

    // Date propre au segment si répétée localement (ou juste avant via
    // segmentEtendu), sinon repli sur la date de tête — jamais une
    // date d'un autre métier voisin. Si ni l'une ni l'autre n'existe,
    // l'incertitude ("la semaine prochaine") ne s'applique que si
    // aucune des trois n'a pu fournir de date.
    const dateLocaleResolue = resoudreDate(segmentLocal, maintenant);
    const dateEtendueResolue = segmentEtendu ? resoudreDate(segmentEtendu, maintenant) : null;
    const dateSegmentResolue = dateLocaleResolue.date ? dateLocaleResolue : (dateEtendueResolue?.date ? dateEtendueResolue : dateLocaleResolue);
    const dateFinale = dateSegmentResolue.date ?? dateGlobaleResolue.date;
    const ambiguiteDate = dateSegmentResolue.date ? dateSegmentResolue.ambiguites : dateGlobaleResolue.date ? dateGlobaleResolue.ambiguites : [];

    // Contexte propre au segment si répété localement (rare), sinon
    // repli sur le contexte de tête partagé. Contraintes : jamais de
    // repli, strictement ce que segmentLocal contient (voir SousBesoin.contraintes) —
    // sauf rappel explicite en fin de phrase, corrigé après coup par reattribuerRappels.
    const contexteLocal = detecterContexte(segmentLocal);
    const quantite = detecterQuantite(segmentQuantite);
    return {
      metier: p.metier,
      quantite: quantite ?? 1,
      heureDebut: heureDebutFinal,
      heureFin: heureFinFinal,
      date: dateFinale,
      moment: heureDebutFinal === null ? detecterMoment(segmentLocal) : null,
      contexte: contexteLocal ?? contexteGlobal,
      contraintes: detecterContraintes(segmentLocal),
      ambiguites: [...ambiguiteDate, ...ambiguiteHoraire],
      quantiteIncertaine: quantite === null && quantiteEstVague(segmentQuantite),
      dateIncertaine: dateFinale === null && (dateSegmentResolue.incertaine || dateGlobaleResolue.incertaine),
      datesMultiples: detecterDatesMultiples(segmentLocal, dateFinale),
    };
  });
  reattribuerRappels(resultat, normalise);
  return resultat;
}

export const BESOIN_STORAGE_KEY = "proparjour:besoin-en-cours";

export type BesoinEnCours = {
  texte: string;
  metier: MetierId | null;
  ville: string | null;
  quantite: number | null;
  date: string | null;
  heureDebut: string | null;
  heureFin: string | null;
  // Lot B — optionnels : un brouillon sauvegardé avant ce lot n'aura
  // jamais ces clés ; lireBesoin ne les invente pas, l'appelant les
  // normalise à null/[] (voir chipsDepuisBesoinSauve).
  contexte?: ContexteDetecte | null;
  contraintes?: ContrainteDetectee[];
  // Lot C — les confirmations en attente ne survivent pas à une
  // reprise de brouillon (l'aller-retour connexion est trop rare pour
  // justifier de les persister) ; l'appelant repart d'aucune ambiguïté
  // en attente, jamais d'une valeur silencieusement "confirmée" à tort.
  // Correction UX pré-lancement — mêmes garanties d'optionnalité que
  // contexte/contraintes ci-dessus : un ancien brouillon sans ces clés
  // reste lisible (undefined, jamais une valeur inventée). Sans elles,
  // le tarif et le titre saisis à la main pour un besoin mono-métier
  // disparaissaient après une inscription/connexion, alors que le cas
  // multi-métiers (SousBesoinEnCours, plus bas) les avait déjà.
  tarifHoraire?: number | null;
  titre?: string;
  // Mission multi-jours (migration 0062) — optionnel : absent ou vide
  // sur un brouillon antérieur, l'appelant (besoin-capture.tsx)
  // reconstruit une seule journée depuis date/heureDebut/heureFin
  // ci-dessus, jamais une erreur sur un vieux brouillon. Présent,
  // prioritaire sur les champs scalaires — ceux-ci restent écrits en
  // parallèle (= première journée) uniquement pour qu'un retour à une
  // version antérieure du code garde un brouillon exploitable.
  journees?: JourneeMission[];
};

// Durée de vie d'un brouillon sauvegardé côté client — assez large pour
// survivre un aller-retour par /connexion (quelques secondes à quelques
// minutes), assez courte pour qu'un brouillon oublié ne réapparaisse pas
// des jours plus tard et n'écrase silencieusement une nouvelle demande
// tapée entre-temps (voir chipsDepuisDemandeSauvee/analyser dans
// besoin-capture.tsx, qui ne réécrasent jamais les cartes existantes).
const DUREE_VIE_BROUILLON_MS = 60 * 60 * 1000;

export function sauvegarderBesoin(besoin: BesoinEnCours) {
  try {
    localStorage.setItem(BESOIN_STORAGE_KEY, JSON.stringify({ savedAt: Date.now(), besoin }));
  } catch {
    // localStorage indisponible (navigation privée, quota...) — ne bloque jamais le parcours.
  }
}

export function lireBesoin(): BesoinEnCours | null {
  try {
    const brut = localStorage.getItem(BESOIN_STORAGE_KEY);
    if (!brut) return null;
    const { savedAt, besoin } = JSON.parse(brut) as { savedAt: number; besoin: BesoinEnCours };
    if (!savedAt || Date.now() - savedAt > DUREE_VIE_BROUILLON_MS) {
      localStorage.removeItem(BESOIN_STORAGE_KEY);
      return null;
    }
    return besoin;
  } catch {
    return null;
  }
}

export function effacerBesoin() {
  try {
    localStorage.removeItem(BESOIN_STORAGE_KEY);
  } catch {
    // Idem — best-effort.
  }
}

export const DEMANDE_STORAGE_KEY = "proparjour:demande-en-cours";

export type SousBesoinEnCours = {
  metier: MetierId;
  quantite: number;
  tarifHoraire: number | null;
  // Toujours résolus (jamais null) avant sauvegarde — repli sur les
  // valeurs globales de la demande si le sous-besoin n'a pas les
  // siennes propres, comme heureDebut/heureFin l'ont toujours fait.
  ville: string;
  date: string;
  heureDebut: string;
  heureFin: string;
  // Lot B — mêmes garanties d'optionnalité que BesoinEnCours ci-dessus.
  contexte?: ContexteDetecte | null;
  contraintes?: ContrainteDetectee[];
  // Mission multi-jours (migration 0062) — mêmes garanties que
  // BesoinEnCours.journees ci-dessus (optionnel, prioritaire sur
  // date/heureDebut/heureFin quand présent et non vide).
  journees?: JourneeMission[];
};

export type DemandeEnCours = {
  titre: string;
  texteOriginal: string;
  // Valeurs par défaut de la demande — chaque sous-besoin porte ses
  // propres ville/date résolues (voir SousBesoinEnCours), ces champs
  // globaux ne servent plus qu'à préremplir l'affichage/titre.
  ville: string;
  date: string;
  heureDebut: string;
  heureFin: string;
  // Mission multi-jours (migration 0062) — journées COMMUNES de la
  // demande (voir Chip.journees/journeesResolues, besoin-capture.tsx) ;
  // mêmes garanties d'optionnalité que ci-dessus.
  journees?: JourneeMission[];
  sousBesoins: SousBesoinEnCours[];
};

/** Mêmes garanties que sauvegarderBesoin/lireBesoin/effacerBesoin, pour la demande décomposée (plusieurs métiers). */
export function sauvegarderDemande(demande: DemandeEnCours) {
  try {
    localStorage.setItem(DEMANDE_STORAGE_KEY, JSON.stringify({ savedAt: Date.now(), demande }));
  } catch {
    // localStorage indisponible — ne bloque jamais le parcours.
  }
}

export function lireDemande(): DemandeEnCours | null {
  try {
    const brut = localStorage.getItem(DEMANDE_STORAGE_KEY);
    if (!brut) return null;
    const { savedAt, demande } = JSON.parse(brut) as { savedAt: number; demande: DemandeEnCours };
    if (!savedAt || Date.now() - savedAt > DUREE_VIE_BROUILLON_MS) {
      localStorage.removeItem(DEMANDE_STORAGE_KEY);
      return null;
    }
    return demande;
  } catch {
    return null;
  }
}

export function effacerDemande() {
  try {
    localStorage.removeItem(DEMANDE_STORAGE_KEY);
  } catch {
    // Idem — best-effort.
  }
}
