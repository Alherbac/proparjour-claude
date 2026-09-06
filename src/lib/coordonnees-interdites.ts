/**
 * Détection de coordonnées de contact direct (téléphone, e-mail, URL,
 * réseaux sociaux) dans un texte — utilisée pour empêcher un
 * prestataire de transmettre au client de quoi le recontacter hors
 * ProParJour (voir envoyerMessage, actions/messages.ts, et
 * envoyerDevis, actions/missions.ts). N'est appliquée que sur le
 * contenu envoyé par un PRESTATAIRE vers un client — jamais l'inverse
 * (le client donne légitimement son adresse de mission, etc.), et ne
 * doit jamais bloquer les échanges normaux sur la mission (lieu,
 * horaires, tarif, dates) : les seuils ci-dessous sont volontairement
 * calibrés pour l'éviter (une date "05/09/2026" ou un tarif "144 €"
 * ne doivent jamais déclencher le motif téléphone).
 */

const MOTS_RESEAUX = [
  "whatsapp",
  "telegram",
  "instagram",
  "insta",
  "snapchat",
  "snap",
  "facebook",
  "messenger",
  "signal",
  "viber",
  "linkedin",
  "tiktok",
];

/** Remplace les contournements courants par lettres/espaces ("arobase", "point", "dot", "at") par leur symbole — avant d'y chercher un e-mail. */
function normaliserPourEmail(texte: string): string {
  return texte
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s*\(?\s*(?:arobase|arrobase|a\s*commercial)\s*\)?\s*/g, "@")
    .replace(/\s+at\s+/g, "@")
    .replace(/\s*\(at\)\s*/g, "@")
    .replace(/\s+(?:point|dot)\s+/g, ".")
    .replace(/\s*\[dot\]\s*/g, ".")
    .replace(/\s*\[at\]\s*/g, "@");
}

const REGEX_EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const REGEX_URL = /\bhttps?:\/\/\S+/i;
const REGEX_WWW = /\bwww\.[a-z0-9-]+\.[a-z]{2,}\S*/i;
const REGEX_DOMAINE_NU = /\b[a-z0-9-]{2,}\.(com|fr|net|org|io|co|me|app|dev|whatsapp)\b/i;
/** "@monpseudo" hors contexte e-mail — poignée de réseau social. */
const REGEX_HANDLE = /(^|[\s(])@[a-z0-9_]{3,30}\b/i;

/**
 * Un numéro de téléphone français : 10 chiffres commençant par 0, ou
 * +33 suivi de 9 chiffres, séparés (ou non) par espaces/points/tirets
 * — jamais par "/" (réservé aux dates, qu'on ne veut surtout pas
 * bloquer). Le texte est d'abord scanné pour des suites de chiffres
 * ainsi séparées, puis chaque suite est nettoyée de ses séparateurs
 * pour vérifier sa forme exacte.
 */
function contientTelephone(texte: string): boolean {
  const suites = texte.match(/(?:\+?\d[\s.-]?){8,}\d/g) ?? [];
  for (const suite of suites) {
    const chiffres = suite.replace(/[\s.-]/g, "");
    const local = chiffres.replace(/^\+?33/, "0");
    if (/^0[1-9]\d{8}$/.test(local)) return true;
    if (/^\+\d{10,14}$/.test(chiffres)) return true;
  }
  return false;
}

function contientEmail(texte: string): boolean {
  return REGEX_EMAIL.test(normaliserPourEmail(texte));
}

function contientUrl(texte: string): boolean {
  return REGEX_URL.test(texte) || REGEX_WWW.test(texte) || REGEX_DOMAINE_NU.test(texte);
}

function contientReseauSocial(texte: string): boolean {
  const bas = texte.toLowerCase();
  if (MOTS_RESEAUX.some((mot) => bas.includes(mot))) return true;
  return REGEX_HANDLE.test(texte);
}

export type CoordonneesDetectees = "telephone" | "email" | "url" | "reseau_social" | null;

/** Renvoie le type de coordonnée détectée (pour un message d'erreur clair), ou null si le texte est propre. */
export function detecterCoordonnees(texte: string): CoordonneesDetectees {
  if (contientTelephone(texte)) return "telephone";
  if (contientEmail(texte)) return "email";
  if (contientUrl(texte)) return "url";
  if (contientReseauSocial(texte)) return "reseau_social";
  return null;
}

const MESSAGE_PAR_TYPE: Record<Exclude<CoordonneesDetectees, null>, string> = {
  telephone: "un numéro de téléphone",
  email: "une adresse e-mail",
  url: "un lien",
  reseau_social: "un identifiant de réseau social",
};

/** Message d'erreur prêt à renvoyer par l'action serveur qui bloque l'envoi. */
export function messageCoordonneesBloquees(type: Exclude<CoordonneesDetectees, null>): string {
  return `Ce message semble contenir ${MESSAGE_PAR_TYPE[type]}. Les coordonnées de contact direct ne peuvent pas être transmises via ProParJour.`;
}
