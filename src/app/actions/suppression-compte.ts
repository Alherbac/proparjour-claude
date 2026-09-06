"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/admin/auth";
import { journaliser } from "@/lib/admin/audit";
import { traduireErreurDb } from "@/lib/erreurs-db";
import type { MissionStatutType } from "@/lib/supabase/database.types";

type ActionResult = { success: true } | { success: false; error: string };

/**
 * L'utilisateur demande la suppression de son compte (RGPD) — une
 * seule demande "en_attente" à la fois, voir 0038. Motif obligatoire
 * (dossier design "Votre profil" / "Paramètres") : le formulaire ne
 * peut déjà pas soumettre sans motif choisi, revérifié ici. Une
 * mission encore active bloque la demande — le texte précise laquelle,
 * pour que l'utilisateur sache quoi terminer d'abord.
 */
export async function demanderSuppressionCompte(motif: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté." };
  }
  if (!motif.trim()) {
    return { success: false, error: "Merci de préciser un motif." };
  }

  const { data: profil } = await supabase.from("users").select("type").eq("id", user.id).maybeSingle();
  const statutsActifs: MissionStatutType[] = ["en_attente", "confirmee", "en_cours"];
  let missionActive: { id: string; lieu: string; date_mission: string } | null = null;
  if (profil?.type === "prestataire") {
    const { data: profilPrestataire } = await supabase.from("prestataires_profils").select("id").eq("user_id", user.id).maybeSingle();
    if (profilPrestataire) {
      const { data: lignes } = await supabase
        .from("mission_lignes")
        .select("mission_id, statut_acceptation, missions(id, lieu, date_mission, statut)")
        .eq("prestataire_id", profilPrestataire.id)
        .eq("statut_acceptation", "acceptee");
      const ligneActive = (lignes ?? []).find((l) => {
        const m = l.missions as unknown as { id: string; lieu: string; date_mission: string; statut: MissionStatutType } | null;
        return m && statutsActifs.includes(m.statut);
      });
      const m = ligneActive?.missions as unknown as { id: string; lieu: string; date_mission: string } | undefined;
      missionActive = m ?? null;
    }
  } else {
    const { data: missions } = await supabase.from("missions").select("id, lieu, date_mission, statut").eq("recruteur_id", user.id).in("statut", statutsActifs);
    missionActive = missions?.[0] ?? null;
  }
  if (missionActive) {
    return {
      success: false,
      error: `Une mission est encore en cours (${missionActive.lieu}, ${missionActive.date_mission}) — elle doit être terminée avant de supprimer votre compte.`,
    };
  }

  const { error } = await supabase.from("demandes_suppression_compte").insert({
    user_id: user.id,
    motif: motif.trim(),
  });
  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Une demande de suppression est déjà en cours pour votre compte." };
    }
    return { success: false, error: traduireErreurDb(error, "Impossible d'enregistrer votre demande pour le moment.") };
  }

  revalidatePath("/client/parametres");
  revalidatePath("/prestataire/profil");
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
    .select("id, user_id, statut, motif")
    .eq("id", demandeId)
    .maybeSingle();
  if (!demande) {
    return { success: false, error: "Demande introuvable." };
  }
  if (demande.statut !== "en_attente") {
    return { success: false, error: "Cette demande a déjà été traitée." };
  }

  // Capturé avant suppression — le journal (§5.12) affiche le rôle,
  // et le compte n'existera plus pour le retrouver ensuite.
  const { data: compteAvantSuppression } = await admin.from("users").select("type").eq("id", demande.user_id).maybeSingle();

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
    motif: decision === "refusee" ? motifRefus : demande.motif,
    details: decision === "traitee" ? { role: compteAvantSuppression?.type ?? null } : undefined,
  });

  revalidatePath("/admin/suppressions");
  return { success: true };
}
