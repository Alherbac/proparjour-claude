"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type ActionResult = { success: true } | { success: false; error: string };

export async function repondreMissionLigne(
  ligneId: string,
  reponse: "acceptee" | "refusee",
): Promise<ActionResult> {
  const supabaseServer = await createClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  const admin = createAdminClient();

  const { data: ligne, error: ligneError } = await admin
    .from("mission_lignes")
    .select("id, mission_id, prestataire_id")
    .eq("id", ligneId)
    .maybeSingle();

  if (ligneError || !ligne) {
    return { success: false, error: "Ligne de mission introuvable." };
  }

  const { data: profil } = await admin
    .from("prestataires_profils")
    .select("id")
    .eq("id", ligne.prestataire_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profil) {
    return { success: false, error: "Cette mission ne vous concerne pas." };
  }

  const { error: updateError } = await admin
    .from("mission_lignes")
    .update({ statut_acceptation: reponse })
    .eq("id", ligneId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  if (reponse === "acceptee") {
    const { data: toutesLesLignes } = await admin
      .from("mission_lignes")
      .select("statut_acceptation")
      .eq("mission_id", ligne.mission_id);

    const toutesAcceptees = (toutesLesLignes ?? []).every(
      (l) => l.statut_acceptation === "acceptee",
    );

    if (toutesAcceptees) {
      await admin.from("missions").update({ statut: "confirmee" }).eq("id", ligne.mission_id);
    }
  }

  return { success: true };
}
