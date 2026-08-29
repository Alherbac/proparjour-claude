"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { JOURS_SEMAINE } from "@/components/onboarding/prestataire/schema";
import { ibanValide, bicValide } from "@/lib/iban";
import { traduireErreurDb } from "@/lib/erreurs-db";
import type { StatutIndependantType, TarifType } from "@/lib/supabase/database.types";

type ActionResult = { success: true } | { success: false; error: string };

export type ProfilPrestataireInput = {
  prenom: string;
  nom: string;
  telephone: string;
  titre: string;
  bio: string;
  ville: string;
  statutIndependant: StatutIndependantType;
  tarifType: TarifType;
  tarifMontant: number;
  specialites: string[];
  competences: string[];
  numeroCarteCnaps: string;
  certifications: string[];
  langues: string[];
  tenue: string;
  secteurExperience: string;
  remunerationCommission: boolean;
  photoUrl?: string;
};

/**
 * Mise à jour des disponibilités et de la visibilité aux recruteurs,
 * depuis "Mon compte" — via le client session (RLS), la policy
 * "prestataires_profils_update_own_or_admin" garantit qu'un
 * prestataire ne peut modifier que sa propre ligne, et le trigger
 * prevent_self_verification_change protège statut_verification (non
 * touché ici de toute façon).
 */
export async function mettreAJourDisponibilites(
  disponibilites: string[],
  visible: boolean,
): Promise<ActionResult> {
  const joursValides = disponibilites.filter((j) => (JOURS_SEMAINE as readonly string[]).includes(j));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  const { error } = await supabase
    .from("prestataires_profils")
    .update({ disponibilites: joursValides, visible })
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: traduireErreurDb(error, "Impossible d'enregistrer vos disponibilités pour le moment.") };
  }

  return { success: true };
}

/**
 * Mise à jour du profil prestataire complet, depuis "Mon compte" —
 * même principe que mettreAJourDisponibilites : client session (RLS),
 * `statut_verification` jamais touché ici.
 */
export async function mettreAJourProfilPrestataire(
  input: ProfilPrestataireInput,
): Promise<ActionResult> {
  if (!input.prenom.trim() || !input.nom.trim() || !input.ville.trim()) {
    return { success: false, error: "Prénom, nom et ville sont requis." };
  }
  if (!input.tarifMontant || input.tarifMontant <= 0) {
    return { success: false, error: "Indiquez un tarif supérieur à 0." };
  }
  if (input.specialites.length === 0) {
    return { success: false, error: "Sélectionnez au moins une spécialité." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  const { error: userError } = await supabase
    .from("users")
    .update({
      prenom: input.prenom.trim(),
      nom: input.nom.trim(),
      telephone: input.telephone.trim() || null,
    })
    .eq("id", user.id);
  if (userError) {
    return { success: false, error: traduireErreurDb(userError, "Impossible d'enregistrer votre profil pour le moment.") };
  }

  const { error: profilError } = await supabase
    .from("prestataires_profils")
    .update({
      titre: input.titre.trim() || null,
      bio: input.bio.trim() || null,
      ville: input.ville.trim(),
      statut_independant: input.statutIndependant,
      tarif_type: input.tarifType,
      tarif_montant: input.tarifMontant,
      specialites: input.specialites,
      competences: input.competences,
      numero_carte_cnaps: input.numeroCarteCnaps.trim() || null,
      certifications: input.certifications,
      langues: input.langues,
      tenue: input.tenue.trim() || null,
      secteur_experience: input.secteurExperience.trim() || null,
      remuneration_commission: input.remunerationCommission,
      ...(input.photoUrl ? { photo_url: input.photoUrl } : {}),
    })
    .eq("user_id", user.id);
  if (profilError) {
    return { success: false, error: traduireErreurDb(profilError, "Impossible d'enregistrer votre profil pour le moment.") };
  }

  revalidatePath("/tableau-de-bord/compte");
  return { success: true };
}

/**
 * Marque une ou plusieurs dates comme disponibles (avec horaires
 * optionnels) ou indisponibles — prime sur le schéma hebdomadaire
 * récurrent pour ces dates. `upsert` sur (prestataire_id, date) :
 * ré-appliquer sur des jours déjà marqués remplace la valeur — permet
 * la sélection multiple (semaine/mois entiers en un seul appel).
 */
export async function definirExceptionsDisponibilite(
  dates: string[],
  disponible: boolean,
  heureDebut: string | null,
  heureFin: string | null,
): Promise<ActionResult> {
  if (dates.length === 0) {
    return { success: false, error: "Sélectionnez au moins un jour." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  const { data: profil } = await supabase
    .from("prestataires_profils")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profil) {
    return { success: false, error: "Profil prestataire introuvable." };
  }

  const { error } = await supabase.from("prestataires_disponibilites_exceptions").upsert(
    dates.map((date) => ({
      prestataire_id: profil.id,
      date,
      disponible,
      heure_debut: disponible ? heureDebut : null,
      heure_fin: disponible ? heureFin : null,
    })),
    { onConflict: "prestataire_id,date" },
  );
  if (error) {
    return { success: false, error: traduireErreurDb(error, "Impossible d'enregistrer vos disponibilités pour le moment.") };
  }

  revalidatePath("/tableau-de-bord/compte");
  return { success: true };
}

/** Retire une ou plusieurs exceptions (retour au schéma hebdomadaire par défaut pour ces dates). */
export async function supprimerExceptionsDisponibilite(dates: string[]): Promise<ActionResult> {
  if (dates.length === 0) {
    return { success: false, error: "Sélectionnez au moins un jour." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  const { data: profil } = await supabase
    .from("prestataires_profils")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profil) {
    return { success: false, error: "Profil prestataire introuvable." };
  }

  const { error } = await supabase
    .from("prestataires_disponibilites_exceptions")
    .delete()
    .eq("prestataire_id", profil.id)
    .in("date", dates);
  if (error) {
    return { success: false, error: traduireErreurDb(error, "Impossible de mettre à jour vos disponibilités pour le moment.") };
  }

  revalidatePath("/tableau-de-bord/compte");
  return { success: true };
}

export type ExperienceInput = {
  intitule: string;
  employeur: string;
  periode: string;
  lieu: string;
  description: string;
};

async function profilPrestataireId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from("prestataires_profils")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.id ?? null;
}

/** Ajoute une expérience (mini-CV) — visible sur la fiche publique dès qu'elle est créée. */
export async function ajouterExperience(input: ExperienceInput): Promise<ActionResult> {
  if (!input.intitule.trim() || !input.periode.trim()) {
    return { success: false, error: "Intitulé et période sont requis." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  const prestataireId = await profilPrestataireId(supabase, user.id);
  if (!prestataireId) {
    return { success: false, error: "Profil prestataire introuvable." };
  }

  const { error } = await supabase.from("experiences").insert({
    prestataire_id: prestataireId,
    intitule: input.intitule.trim(),
    employeur: input.employeur.trim() || null,
    periode: input.periode.trim(),
    lieu: input.lieu.trim() || null,
    description: input.description.trim() || null,
  });
  if (error) {
    return { success: false, error: traduireErreurDb(error, "Impossible d'enregistrer cette expérience pour le moment.") };
  }

  revalidatePath("/tableau-de-bord/compte");
  return { success: true };
}

/** Modifie une expérience existante — la policy RLS garantit qu'on ne peut modifier que les siennes. */
export async function modifierExperience(
  experienceId: string,
  input: ExperienceInput,
): Promise<ActionResult> {
  if (!input.intitule.trim() || !input.periode.trim()) {
    return { success: false, error: "Intitulé et période sont requis." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  const { error } = await supabase
    .from("experiences")
    .update({
      intitule: input.intitule.trim(),
      employeur: input.employeur.trim() || null,
      periode: input.periode.trim(),
      lieu: input.lieu.trim() || null,
      description: input.description.trim() || null,
    })
    .eq("id", experienceId);
  if (error) {
    return { success: false, error: traduireErreurDb(error, "Impossible de modifier cette expérience pour le moment.") };
  }

  revalidatePath("/tableau-de-bord/compte");
  return { success: true };
}

export async function supprimerExperience(experienceId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  const { error } = await supabase.from("experiences").delete().eq("id", experienceId);
  if (error) {
    return { success: false, error: traduireErreurDb(error, "Impossible de supprimer cette expérience pour le moment.") };
  }

  revalidatePath("/tableau-de-bord/compte");
  return { success: true };
}

export type ProfilRecruteurInput = {
  prenom: string;
  nom: string;
  telephone: string;
  ville: string;
  entreprise?: {
    raisonSociale: string;
    siret: string;
    secteurActivite: string;
  };
};

const SIRET_REGEX = /^\d{14}$/;

/**
 * Mise à jour du profil recruteur (particulier ou entreprise), depuis
 * "Mon compte" — jusqu'ici en lecture seule côté recruteur (seul le
 * prestataire avait un vrai formulaire d'édition). Même principe que
 * mettreAJourProfilPrestataire : client session (RLS), `entreprises`
 * n'est mis à jour que si le recruteur en a une (policy
 * entreprises_update_own_or_admin, 0001_init.sql).
 */
export async function mettreAJourProfilRecruteur(input: ProfilRecruteurInput): Promise<ActionResult> {
  if (!input.prenom.trim() || !input.nom.trim()) {
    return { success: false, error: "Prénom et nom sont requis." };
  }
  if (input.entreprise) {
    if (!input.entreprise.raisonSociale.trim() || !input.entreprise.secteurActivite.trim()) {
      return { success: false, error: "Raison sociale et secteur d'activité sont requis." };
    }
    if (!SIRET_REGEX.test(input.entreprise.siret.trim())) {
      return { success: false, error: "Le SIRET doit contenir exactement 14 chiffres." };
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  const { error: userError } = await supabase
    .from("users")
    .update({
      prenom: input.prenom.trim(),
      nom: input.nom.trim(),
      telephone: input.telephone.trim() || null,
      ville: input.ville.trim() || null,
    })
    .eq("id", user.id);
  if (userError) {
    return { success: false, error: "Impossible d'enregistrer vos informations pour le moment. Réessayez dans un instant." };
  }

  if (input.entreprise) {
    const { error: entrepriseError } = await supabase
      .from("entreprises")
      .update({
        raison_sociale: input.entreprise.raisonSociale.trim(),
        siret: input.entreprise.siret.trim(),
        secteur_activite: input.entreprise.secteurActivite.trim(),
      })
      .eq("user_id", user.id);
    if (entrepriseError) {
      if (entrepriseError.code === "23514") {
        return { success: false, error: "Le SIRET doit contenir exactement 14 chiffres." };
      }
      return { success: false, error: "Impossible d'enregistrer les informations de l'entreprise pour le moment." };
    }
  }

  revalidatePath("/tableau-de-bord/compte");
  return { success: true };
}

/**
 * Enregistre le RIB du prestataire, nécessaire à la libération du
 * paiement en fin de mission (0118). Validation par clé mod-97 côté
 * serveur (jamais uniquement côté client) — voir lib/iban.ts.
 */
export async function modifierCoordonneesBancaires(iban: string, bic: string): Promise<ActionResult> {
  const ibanNormalise = iban.replace(/\s+/g, "").toUpperCase();
  const bicNormalise = bic.replace(/\s+/g, "").toUpperCase();

  if (!ibanValide(ibanNormalise)) {
    return { success: false, error: "IBAN invalide — vérifiez la saisie." };
  }
  if (!bicValide(bicNormalise)) {
    return { success: false, error: "BIC/SWIFT invalide — vérifiez la saisie." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  const { error } = await supabase
    .from("prestataires_profils")
    .update({ iban: ibanNormalise, bic: bicNormalise })
    .eq("user_id", user.id);
  if (error) {
    return { success: false, error: traduireErreurDb(error, "Impossible d'enregistrer vos coordonnées bancaires pour le moment.") };
  }

  revalidatePath("/tableau-de-bord/compte");
  return { success: true };
}
