"use server";

import { createClient } from "@/lib/supabase/server";
import { JOURS_SEMAINE } from "@/components/onboarding/prestataire/schema";

type ActionResult = { success: true } | { success: false; error: string };

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
