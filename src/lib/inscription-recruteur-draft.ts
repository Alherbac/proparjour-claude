import type { RecruteurFormValues } from "@/components/onboarding/recruteur/schema";

const STORAGE_KEY = "ppj_inscription_recruteur_draft";

export type RecruteurDraft = {
  email: string;
  next: string | null;
  valeurs: Omit<RecruteurFormValues, "motDePasse">;
};

/**
 * Filet de sécurité pour le parcours d'inscription recruteur (bug
 * staging : confirmation d'e-mail requise). `supabase.auth.signUp` ne
 * renvoie aucune session tant que l'e-mail n'est pas confirmé — la
 * complétion du profil (completerProfilRecruteur, actions/inscription.ts)
 * ne peut donc pas s'exécuter juste après l'écran "vérifiez votre
 * e-mail" (l'utilisateur revient parfois dans un autre onglet, voire
 * un autre appareil). On sauvegarde ici les données saisies — jamais
 * le mot de passe — pour terminer automatiquement l'inscription dès
 * qu'une session valide existe : voir l'effet de montage de
 * RecruteurForm et src/app/auth/confirm/page.tsx.
 */
export function sauvegarderBrouillonRecruteur(draft: RecruteurDraft) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // localStorage indisponible (navigation privée stricte, etc.) —
    // dégrade juste la reprise automatique, ne bloque jamais l'inscription.
  }
}

/** Renvoie le brouillon seulement s'il correspond à l'e-mail confirmé — jamais celui d'un autre compte resté dans le même navigateur. */
export function lireBrouillonRecruteur(email: string): RecruteurDraft | null {
  try {
    const brut = window.localStorage.getItem(STORAGE_KEY);
    if (!brut) return null;
    const draft = JSON.parse(brut) as RecruteurDraft;
    return draft?.email?.toLowerCase() === email.toLowerCase() ? draft : null;
  } catch {
    return null;
  }
}

export function effacerBrouillonRecruteur() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Volontairement ignoré.
  }
}
