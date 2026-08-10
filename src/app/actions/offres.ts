"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { creerNotification } from "@/lib/notifications";
import type { MetierType } from "@/lib/supabase/database.types";

type ActionResult<T = undefined> =
  | ({ success: true } & (T extends undefined ? object : { data: T }))
  | { success: false; error: string };

export type PublierOffreInput = {
  titre: string;
  description: string;
  metier: MetierType;
  ville: string;
  dateMission: string;
  heureDebut: string;
  heureFin: string;
  tarifHoraire: number;
};

/**
 * Publie une offre ouverte (aucun prestataire nommé — voir 0023) puis
 * notifie en tâche de fond tous les prestataires du même métier, en
 * best-effort (creerNotification avale ses propres erreurs) — un
 * échec de notification ne doit jamais faire échouer la publication.
 */
export async function publierOffre(
  input: PublierOffreInput,
): Promise<ActionResult<{ offreId: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  if (!input.titre.trim() || !input.description.trim() || !input.ville.trim() || !input.dateMission) {
    return { success: false, error: "Titre, description, ville et date sont requis." };
  }
  if (!input.tarifHoraire || input.tarifHoraire <= 0) {
    return { success: false, error: "Indiquez un tarif horaire supérieur à 0." };
  }
  if (input.heureDebut === input.heureFin) {
    return { success: false, error: "L'heure de fin doit être différente de l'heure de début." };
  }

  const { data: offre, error } = await supabase
    .from("offres")
    .insert({
      recruteur_id: user.id,
      titre: input.titre.trim(),
      description: input.description.trim(),
      metier: input.metier,
      ville: input.ville.trim(),
      date_mission: input.dateMission,
      heure_debut: input.heureDebut,
      heure_fin: input.heureFin,
      tarif_horaire: input.tarifHoraire,
    })
    .select("id")
    .single();

  if (error || !offre) {
    return { success: false, error: error?.message ?? "Échec de la publication de l'offre." };
  }

  const admin = createAdminClient();
  const { data: correspondants } = await admin
    .from("prestataires_profils")
    .select("user_id")
    .eq("metier", input.metier);

  const cibles = (correspondants ?? []).filter((p) => p.user_id !== user.id);
  await Promise.all(
    cibles.map((p) =>
      creerNotification({
        userId: p.user_id,
        type: "offre_correspondante",
        titre: "Nouvelle offre de mission",
        contenu: `${input.titre} — ${input.ville}, le ${input.dateMission}`,
        lien: "/tableau-de-bord/offres",
      }),
    ),
  );

  revalidatePath("/tableau-de-bord/mes-offres");
  return { success: true, data: { offreId: offre.id } };
}

export async function postulerOffre(offreId: string, message?: string): Promise<ActionResult> {
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

  const { data: offre } = await supabase
    .from("offres")
    .select("id, recruteur_id, titre, statut")
    .eq("id", offreId)
    .maybeSingle();
  if (!offre || offre.statut !== "publiee") {
    return { success: false, error: "Cette offre n'est plus disponible." };
  }

  const { error } = await supabase.from("candidatures").insert({
    offre_id: offreId,
    prestataire_id: profil.id,
    message: message?.trim() || null,
  });
  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Vous avez déjà postulé à cette offre." };
    }
    return { success: false, error: error.message };
  }

  await creerNotification({
    userId: offre.recruteur_id,
    type: "candidature_recue",
    titre: "Nouvelle candidature reçue",
    contenu: offre.titre,
    lien: "/tableau-de-bord/mes-offres",
  });

  revalidatePath("/tableau-de-bord/offres");
  return { success: true };
}

export async function repondreCandidature(
  candidatureId: string,
  reponse: "acceptee" | "refusee",
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  const { data: candidature } = await supabase
    .from("candidatures")
    .select("id, offre_id, prestataire_id")
    .eq("id", candidatureId)
    .maybeSingle();
  if (!candidature) {
    return { success: false, error: "Candidature introuvable." };
  }

  const { error } = await supabase
    .from("candidatures")
    .update({ statut: reponse })
    .eq("id", candidatureId);
  if (error) {
    return { success: false, error: error.message };
  }

  const [{ data: offre }, { data: profil }] = await Promise.all([
    supabase.from("offres").select("titre").eq("id", candidature.offre_id).maybeSingle(),
    supabase.from("prestataires_profils").select("user_id").eq("id", candidature.prestataire_id).maybeSingle(),
  ]);

  if (profil) {
    await creerNotification({
      userId: profil.user_id,
      type: reponse === "acceptee" ? "candidature_acceptee" : "candidature_refusee",
      titre: reponse === "acceptee" ? "Candidature acceptée" : "Candidature déclinée",
      contenu: offre?.titre ?? undefined,
      lien: "/tableau-de-bord/offres",
    });
  }

  if (reponse === "acceptee") {
    await supabase.from("offres").update({ statut: "pourvue" }).eq("id", candidature.offre_id);
  }

  revalidatePath("/tableau-de-bord/mes-offres");
  return { success: true };
}
