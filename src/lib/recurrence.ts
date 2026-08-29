import { jourDeLaSemaine, type JourSemaine } from "@/config/jours-semaine";

/**
 * Calcul pur des dates d'occurrence d'une série récurrente (Bloc 7) —
 * aucune écriture, aucune donnée fictive : la liste renvoyée est
 * exactement ce qui sera proposé au client pour vérification de
 * disponibilité, jamais recalculée différemment ailleurs.
 *
 * "Mensuelle" ignore joursSemaine et reprend le jour calendaire de
 * dateDebut chaque mois (ex. le 15) — pas de règle "3ème samedi du
 * mois", non demandée et ambiguë à définir sans confirmation.
 */

export type Frequence = "hebdomadaire" | "toutes_les_2_semaines" | "jours_specifiques" | "mensuelle";

export const FREQUENCES: { value: Frequence; label: string }[] = [
  { value: "hebdomadaire", label: "Toutes les semaines" },
  { value: "toutes_les_2_semaines", label: "Toutes les 2 semaines" },
  { value: "jours_specifiques", label: "Jours précis chaque semaine" },
  { value: "mensuelle", label: "Chaque mois" },
];

/** Garde-fou contre une série qui générerait un nombre déraisonnable d'occurrences. */
export const MAX_OCCURRENCES = 52;

export type ParametresRecurrence = {
  frequence: Frequence;
  joursSemaine: JourSemaine[];
  dateDebut: string;
  dateFin: string;
};

export type ResultatOccurrences =
  | { erreur: string }
  | { dates: string[]; tronque: boolean };

/**
 * Sérialise en jj/mm/aaaa à partir des composantes LOCALES du Date —
 * jamais toISOString(), qui convertit en UTC : un Date construit à
 * minuit local (ex. "2026-08-16T00:00:00" en Europe/Paris, UTC+2)
 * correspond à la veille en UTC, donc toISOString().slice(0,10)
 * renvoyait silencieusement la date d'hier. Avec ajouterJours qui
 * réinjectait ce résultat comme entrée du jour suivant, le curseur de
 * calculerOccurrences restait bloqué indéfiniment sur la même date
 * (point fixe) — bug détecté en test live (aucune occurrence jamais
 * trouvée), corrigé ici avant tout calcul de date local.
 */
function formatDateLocale(d: Date): string {
  const annee = d.getFullYear();
  const mois = String(d.getMonth() + 1).padStart(2, "0");
  const jour = String(d.getDate()).padStart(2, "0");
  return `${annee}-${mois}-${jour}`;
}

function ajouterJours(dateIso: string, n: number): string {
  const d = new Date(`${dateIso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return formatDateLocale(d);
}

function lundiDeLaSemaine(dateIso: string): string {
  const d = new Date(`${dateIso}T00:00:00`);
  return ajouterJours(dateIso, -((d.getDay() + 6) % 7));
}

function ajouterMois(dateIso: string, n: number): string {
  const origine = new Date(`${dateIso}T00:00:00`);
  const jourVoulu = origine.getDate();
  const d = new Date(origine.getFullYear(), origine.getMonth() + n, 1);
  const dernierJourMois = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(jourVoulu, dernierJourMois));
  return formatDateLocale(d);
}

export function calculerOccurrences(params: ParametresRecurrence): ResultatOccurrences {
  const { frequence, joursSemaine, dateDebut, dateFin } = params;

  if (!dateDebut || !dateFin) {
    return { erreur: "Indiquez une date de début et une date de fin." };
  }
  if (dateFin < dateDebut) {
    return { erreur: "La date de fin doit être postérieure à la date de début." };
  }
  if (frequence !== "mensuelle" && joursSemaine.length === 0) {
    return { erreur: "Sélectionnez au moins un jour de la semaine." };
  }

  const aujourdhui = new Date().toISOString().slice(0, 10);
  const dates: string[] = [];
  let tronque = false;

  if (frequence === "mensuelle") {
    let compteur = 0;
    let courante = dateDebut;
    while (courante <= dateFin) {
      if (dates.length >= MAX_OCCURRENCES) {
        tronque = true;
        break;
      }
      if (courante >= aujourdhui) dates.push(courante);
      compteur += 1;
      courante = ajouterMois(dateDebut, compteur);
    }
  } else {
    const joursVoulus = new Set<JourSemaine>(joursSemaine);
    const intervalleSemaines = frequence === "toutes_les_2_semaines" ? 2 : 1;
    const lundiDebut = lundiDeLaSemaine(dateDebut);
    const MAX_JOURS_BALAYES = 366 * 2;

    let curseur = dateDebut;
    let joursBalayes = 0;
    while (curseur <= dateFin && joursBalayes < MAX_JOURS_BALAYES) {
      if (dates.length >= MAX_OCCURRENCES) {
        tronque = true;
        break;
      }
      if (joursVoulus.has(jourDeLaSemaine(curseur))) {
        const semainesEcoulees = Math.round(
          (new Date(`${lundiDeLaSemaine(curseur)}T00:00:00`).getTime() -
            new Date(`${lundiDebut}T00:00:00`).getTime()) /
            (7 * 24 * 3_600_000),
        );
        if (semainesEcoulees % intervalleSemaines === 0 && curseur >= aujourdhui) {
          dates.push(curseur);
        }
      }
      curseur = ajouterJours(curseur, 1);
      joursBalayes += 1;
    }
  }

  if (dates.length === 0) {
    return { erreur: "Aucune occurrence future ne correspond à ces critères sur la période choisie." };
  }

  return { dates, tronque };
}
