/**
 * Détection de coordonnées de contact direct (téléphone, e-mail, URL,
 * réseaux sociaux) dans un texte — utilisée pour empêcher n'IMPORTE
 * QUEL rôle (client comme prestataire) de transmettre de quoi
 * recontacter l'autre hors ProParJour (voir envoyerMessage,
 * actions/messages.ts ; envoyerDevis et demanderAjustementDevis,
 * actions/missions.ts ; postulerOffre, actions/offres.ts — même règle
 * des deux côtés depuis la correction "anti-contournement symétrique").
 * Ne doit jamais bloquer les échanges normaux sur la mission (lieu,
 * horaires, tarif, dates, adresse de mission) : les seuils ci-dessous
 * sont volontairement calibrés pour l'éviter (une date "05/09/2026",
 * un tarif "144 €" ou une adresse "21 rue de la Paix" ne doivent
 * jamais déclencher le motif téléphone).
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

/**
 * Remplace les contournements courants par lettres/espaces ("arobase",
 * "point", "dot", "at") par leur symbole, puis resserre les espaces
 * autour d'un "@" déjà littéral ("nom @ gmail . com") — avant d'y
 * chercher un e-mail. Un "@" isolé n'apparaît quasiment jamais dans
 * une phrase française normale, donc resserrer tout ce qui le touche
 * ne risque pas de faux positif ; le "." qui suit est lui aussi
 * resserré, mais seulement dans les ~40 caractères après le "@" (le
 * nom de domaine), jamais dans tout le reste du message.
 */
function normaliserPourEmail(texte: string): string {
  const rapproche = texte
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s*\(?\s*(?:arobase|arrobase|a\s*commercial)\s*\)?\s*/g, "@")
    .replace(/\s+at\s+/g, "@")
    .replace(/\s*\(at\)\s*/g, "@")
    .replace(/\s+(?:point|dot)\s+/g, ".")
    .replace(/\s*\[dot\]\s*/g, ".")
    .replace(/\s*\[at\]\s*/g, "@")
    .replace(/\s*@\s*/g, "@");
  return rapproche.replace(/@([a-z0-9\s.-]{1,40})/g, (_match, domaine: string) => `@${domaine.replace(/\s+/g, "")}`);
}

/**
 * Un chiffre écrit en toutes lettres ("zéro", "un", "deux"...) — pour
 * retrouver un téléphone du type "zéro six douze trente-quatre"
 * détourné pour échapper à la détection de suites de chiffres.
 * Volontairement limité aux chiffres simples (0-9) : les dizaines
 * composées ("vingt", "quarante"...) sont trop fréquentes hors
 * contexte numérique pour être mappées sans risquer un faux positif —
 * un téléphone lu chiffre par chiffre reste la forme la plus courante
 * de ce contournement, et huit chiffres de ce type à la suite ne se
 * produisent jamais par hasard dans une phrase normale.
 */
const MOTS_CHIFFRE: Record<string, string> = {
  zero: "0",
  un: "1",
  une: "1",
  deux: "2",
  trois: "3",
  quatre: "4",
  cinq: "5",
  six: "6",
  sept: "7",
  huit: "8",
  neuf: "9",
};

/** Remplace chaque mot reconnu comme un chiffre par le chiffre correspondant, en conservant tel quel tout le reste (y compris les espaces) — pour pouvoir ensuite passer par exactement le même détecteur de suite de chiffres qu'un texte déjà numérique (contientTelephone). */
function chiffresEnLettresVersChiffres(texte: string): string {
  const normalise = texte
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  return normalise
    .split(/\b/)
    .map((mot) => MOTS_CHIFFRE[mot] ?? mot)
    .join("");
}

const REGEX_EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const REGEX_URL = /\bhttps?:\/\/\S+/i;
const REGEX_WWW = /\bwww\.[a-z0-9-]+\.[a-z]{2,}\S*/i;
const REGEX_DOMAINE_NU = /\b[a-z0-9-]{2,}\.(com|fr|net|org|io|co|me|app|dev|whatsapp)\b/i;
/** "@monpseudo" hors contexte e-mail — poignée de réseau social. */
const REGEX_HANDLE = /(^|[\s(])@[a-z0-9_]{3,30}\b/i;

/**
 * Un numéro de téléphone français : 10 chiffres commençant par 0, ou
 * +33 suivi de 9 chiffres, séparés (ou non) par espaces/points/tirets/
 * virgules/underscores — jamais par "/" (réservé aux dates, qu'on ne
 * veut surtout pas bloquer). Le texte est d'abord scanné pour des
 * suites de chiffres ainsi séparées (y compris une version où chaque
 * chiffre était écrit en toutes lettres, voir
 * chiffresEnLettresVersChiffres), puis chaque suite est nettoyée de
 * ses séparateurs pour vérifier sa forme exacte.
 */
function contientTelephone(texte: string): boolean {
  for (const version of [texte, chiffresEnLettresVersChiffres(texte)]) {
    const suites = version.match(/(?:\+?\d[\s.,_-]?){8,}\d/g) ?? [];
    for (const suite of suites) {
      const chiffres = suite.replace(/[\s.,_-]/g, "");
      const local = chiffres.replace(/^\+?33/, "0");
      if (/^0[1-9]\d{8}$/.test(local)) return true;
      if (/^\+\d{10,14}$/.test(chiffres)) return true;
    }
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
  return `Ce message semble contenir ${MESSAGE_PAR_TYPE[type]}. Les coordonnées de contact direct ne peuvent pas être transmises via ProParJour. L'échange de coordonnées personnelles et le contournement de la plateforme sont interdits.`;
}
