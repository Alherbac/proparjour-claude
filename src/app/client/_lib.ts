/**
 * Aides pures, propres à /client — extraites hors composant pour ne
 * jamais appeler Date.now()/new Date() directement dans un rendu
 * (règle du linter react-hooks/purity).
 */
/** Durée en heures entre deux horaires "HH:MM[:SS]" — gère les missions de nuit qui traversent minuit (fin < début), sans quoi la durée calculée devient négative (voir même correctif dans /prestataire/_lib.ts, écrit séparément : Règle N°0). */
export function heuresEntre(heureDebut: string, heureFin: string): number {
  const [hD, mD] = heureDebut.split(":").map(Number);
  const [hF, mF] = heureFin.split(":").map(Number);
  let minutes = hF * 60 + mF - (hD * 60 + mD);
  if (minutes <= 0) minutes += 24 * 60;
  return minutes / 60;
}

export function joursDepuis(dateIso: string): number {
  const diff = Date.now() - new Date(dateIso).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function ancienneteFr(dateIso: string): string {
  const heures = Math.floor((Date.now() - new Date(dateIso).getTime()) / (1000 * 60 * 60));
  if (heures < 1) return "à l'instant";
  if (heures < 24) return `il y a ${heures} h`;
  const jours = Math.floor(heures / 24);
  if (jours === 1) return "hier";
  return `il y a ${jours} j`;
}

/** "Samedi 20 septembre" — vérifié contre un vrai objet Date, jamais écrit de mémoire (§6.f). */
export function dateLongueFr(dateIso: string): string {
  const brut = new Date(`${dateIso}T00:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  return brut.charAt(0).toUpperCase() + brut.slice(1);
}

export function dateCourteFr(dateIso: string): string {
  return new Date(`${dateIso}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

import type { BadgeTone } from "@/app/client/_components/badge";
import type { MissionStatutType, CandidatureStatutType } from "@/lib/supabase/database.types";

/** Un seul libellé/badge par statut, référencé partout où un statut de mission est affiché (§6.e). */
export const BADGE_STATUT_MISSION: Record<MissionStatutType, { label: string; tone: BadgeTone }> = {
  en_attente: { label: "À venir", tone: "gris" },
  confirmee: { label: "Confirmée", tone: "bleu" },
  en_cours: { label: "En cours", tone: "vert" },
  terminee: { label: "Terminée", tone: "vert" },
  annulee: { label: "Annulée", tone: "gris" },
  litige: { label: "Litige", tone: "rouge" },
};

export const BADGE_STATUT_CANDIDATURE: Record<CandidatureStatutType, { label: string; tone: BadgeTone }> = {
  en_attente: { label: "À examiner", tone: "rouge" },
  en_discussion: { label: "En discussion", tone: "orange" },
  acceptee: { label: "Retenue", tone: "vert" },
  refusee: { label: "Écartée", tone: "gris" },
};

import type { PaiementStatutType } from "@/lib/supabase/database.types";

export const BADGE_STATUT_FACTURE: Record<"a_emettre" | PaiementStatutType, { label: string; tone: BadgeTone }> = {
  a_emettre: { label: "À émettre", tone: "gris" },
  en_attente: { label: "À émettre", tone: "gris" },
  sequestre: { label: "Émise", tone: "orange" },
  libere: { label: "Émise", tone: "vert" },
  rembourse: { label: "Remboursée", tone: "gris" },
  echec: { label: "Échec", tone: "rouge" },
};

/**
 * "PPJ-2026-4F2A1C" — même convention d'affichage que le reste du
 * site (jamais un identifiant stocké). Recalculée ici à partir de
 * l'id et de la date de CRÉATION réels de la mission — pas la date
 * de mission — pour produire EXACTEMENT la même référence que
 * l'espace admin sur la même mission (formule identique à
 * lib/admin/reference.ts, dupliquée volontairement, jamais importée :
 * Règle N°0).
 */
export function referenceMissionClient(mission: { id: string; created_at: string }): string {
  const annee = new Date(mission.created_at).getFullYear();
  return `PPJ-${annee}-${mission.id.slice(0, 6).toUpperCase()}`;
}
