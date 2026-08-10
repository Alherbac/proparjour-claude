"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { JOURS_SEMAINE } from "@/components/onboarding/prestataire/schema";
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
    return { success: false, error: error.message };
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
    return { success: false, error: userError.message };
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
    return { success: false, error: profilError.message };
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
    return { success: false, error: error.message };
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
    return { success: false, error: error.message };
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
    return { success: false, error: error.message };
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
    return { success: false, error: error.message };
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
    return { success: false, error: error.message };
  }

  revalidatePath("/tableau-de-bord/compte");
  return { success: true };
}
