"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/admin/auth";
import { journaliser } from "@/lib/admin/audit";
import { traduireErreurDb } from "@/lib/erreurs-db";

type ActionResult = { success: true } | { success: false; error: string };

/** L'utilisateur demande la suppression de son compte (RGPD) — une seule demande "en_attente" à la fois, voir 0038. */
export async function demanderSuppressionCompte(motif: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  const { error } = await supabase.from("demandes_suppression_compte").insert({
    user_id: user.id,
    motif: motif.trim() || null,
  });
  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Une demande de suppression est déjà en cours pour votre compte." };
    }
    return { success: false, error: traduireErreurDb(error, "Impossible d'enregistrer votre demande pour le moment.") };
  }

  revalidatePath("/tableau-de-bord/compte");
  return { success: true };
}

/**
 * Traitement admin — "traitee" supprime réellement le compte
 * (auth.admin.deleteUser, cascade FK sur toutes les tables métier
 * déjà `on delete cascade`) : irréversible, donc jamais automatique,
 * toujours une décision explicite après revue du motif.
 */
export async function traiterDemandeSuppression(
  demandeId: string,
  decision: "traitee" | "refusee",
  motifRefus?: string,
): Promise<ActionResult> {
  const session = await requireAdminSession();
  if (session.role !== "admin") {
    return { success: false, error: "Seul un administrateur peut traiter une demande de suppression." };
  }
  if (decision === "refusee" && !motifRefus?.trim()) {
    return { success: false, error: "Le motif de refus est obligatoire." };
  }

  const admin = createAdminClient();
  const { data: demande } = await admin
    .from("demandes_suppression_compte")
    .select("id, user_id, statut")
    .eq("id", demandeId)
    .maybeSingle();
  if (!demande) {
    return { success: false, error: "Demande introuvable." };
  }
  if (demande.statut !== "en_attente") {
    return { success: false, error: "Cette demande a déjà été traitée." };
  }

  if (decision === "traitee") {
    // `public.users.id` cascade sur `auth.users`, et `demandes_suppression_compte.user_id`
    // cascade sur `public.users` (0001/0038) : supprimer le compte fait
    // disparaître la ligne de demande elle-même avec lui — inutile (et
    // impossible, la ligne n'existe déjà plus) de la mettre à jour après coup.
    // L'audit log, non contraint par clé étrangère, reste la seule trace.
    const { error: deleteError } = await admin.auth.admin.deleteUser(demande.user_id);
    if (deleteError) {
      return { success: false, error: "Impossible de supprimer ce compte pour le moment." };
    }
  } else {
    const { error } = await admin
      .from("demandes_suppression_compte")
      .update({
        statut: "refusee",
        traitee_par: session.userId,
        traitee_le: new Date().toISOString(),
        motif_refus: motifRefus!.trim(),
      })
      .eq("id", demandeId);
    if (error) {
      return { success: false, error: traduireErreurDb(error, "Impossible de mettre à jour cette demande pour le moment.") };
    }
  }

  await journaliser({
    adminId: session.userId,
    action: decision === "traitee" ? "compte_supprime" : "suppression_refusee",
    cibleType: "utilisateur",
    cibleId: demande.user_id,
    motif: decision === "refusee" ? motifRefus : null,
  });

  revalidatePath("/admin/suppressions");
  return { success: true };
}
