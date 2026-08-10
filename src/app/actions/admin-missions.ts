"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe/server";
import { creerNotification } from "@/lib/notifications";
import { creerMessageSysteme } from "@/lib/messages";
import { journaliser } from "@/lib/admin/audit";
import type { MissionStatutType } from "@/lib/supabase/database.types";

type ActionResult = { success: true } | { success: false; error: string };

async function prestataireUserIds(admin: ReturnType<typeof createAdminClient>, missionId: string) {
  const { data: lignes } = await admin.from("mission_lignes").select("prestataire_id").eq("mission_id", missionId);
  const profilIds = [...new Set((lignes ?? []).map((l) => l.prestataire_id))];
  if (profilIds.length === 0) return [];
  const { data: profils } = await admin.from("prestataires_profils").select("user_id").in("id", profilIds);
  return (profils ?? []).map((p) => p.user_id);
}

const STATUTS_VALIDES: MissionStatutType[] = [
  "en_attente",
  "confirmee",
  "en_cours",
  "terminee",
  "annulee",
  "litige",
];

/** Force un changement de statut — motif obligatoire, tracé dans admin_audit_log (cahier des charges §9 et §17). */
export async function forcerStatutMission(
  missionId: string,
  nouveauStatut: MissionStatutType,
  motif: string,
): Promise<ActionResult> {
  if (!motif.trim()) {
    return { success: false, error: "Le motif est obligatoire." };
  }
  if (!STATUTS_VALIDES.includes(nouveauStatut)) {
    return { success: false, error: "Statut invalide." };
  }

  const session = await requireAdminSession();
  const admin = createAdminClient();

  const { data: mission } = await admin.from("missions").select("id, statut, recruteur_id").eq("id", missionId).maybeSingle();
  if (!mission) {
    return { success: false, error: "Mission introuvable." };
  }

  const { error } = await admin.from("missions").update({ statut: nouveauStatut }).eq("id", missionId);
  if (error) {
    return { success: false, error: error.message };
  }

  await journaliser({
    adminId: session.userId,
    action: "mission_statut_force",
    cibleType: "mission",
    cibleId: missionId,
    motif,
    details: { ancien_statut: mission.statut, nouveau_statut: nouveauStatut },
  });

  const destinataires = [mission.recruteur_id, ...(await prestataireUserIds(admin, missionId))];
  await Promise.all(
    destinataires.map((userId) =>
      Promise.all([
        creerNotification({
          userId,
          type: "mission_statut_modifie",
          titre: "Statut de mission modifié",
          contenu: `Un administrateur a modifié le statut de votre mission : ${motif.trim()}`,
          lien: `/missions/${missionId}`,
          missionId,
        }),
        creerMessageSysteme({
          missionId,
          expediteurId: session.userId,
          destinataireId: userId,
          contenu: `⚙️ Un administrateur a changé le statut de cette mission (${nouveauStatut}) : ${motif.trim()}`,
        }),
      ]),
    ),
  );

  revalidatePath("/admin/missions");
  return { success: true };
}

/** Débloque manuellement les fonds séquestrés — cas d'arbitrage (litige résolu en faveur du prestataire, etc.). */
export async function debloquerFondsMission(missionId: string, motif: string): Promise<ActionResult> {
  if (!motif.trim()) {
    return { success: false, error: "Le motif est obligatoire." };
  }

  const session = await requireAdminSession();
  const admin = createAdminClient();

  const { data: paiement } = await admin.from("paiements").select("id, statut").eq("mission_id", missionId).maybeSingle();
  if (!paiement) {
    return { success: false, error: "Aucun paiement associé à cette mission." };
  }
  if (paiement.statut !== "sequestre") {
    return { success: false, error: "Les fonds ne sont pas en séquestre." };
  }

  const { error } = await admin
    .from("paiements")
    .update({ statut: "libere", date_deblocage: new Date().toISOString() })
    .eq("mission_id", missionId);
  if (error) {
    return { success: false, error: error.message };
  }

  await journaliser({
    adminId: session.userId,
    action: "fonds_debloques",
    cibleType: "mission",
    cibleId: missionId,
    motif,
  });

  const destinataires = await prestataireUserIds(admin, missionId);
  await Promise.all(
    destinataires.map((userId) =>
      creerNotification({
        userId,
        type: "paiement_libere",
        titre: "Paiement débloqué",
        contenu: "Un administrateur a débloqué le paiement de cette mission.",
        lien: `/missions/${missionId}`,
        missionId,
      }),
    ),
  );

  revalidatePath("/admin/missions");
  return { success: true };
}

/**
 * Annulation forcée par l'admin — contrairement à annulerMission (Server
 * Action recruteur), ignore volontairement la règle des 48h : c'est
 * une décision d'arbitrage, pas un self-service.
 */
export async function annulerMissionAdmin(missionId: string, motif: string): Promise<ActionResult> {
  if (!motif.trim()) {
    return { success: false, error: "Le motif est obligatoire." };
  }

  const session = await requireAdminSession();
  const admin = createAdminClient();

  const { data: mission } = await admin.from("missions").select("id, statut, recruteur_id").eq("id", missionId).maybeSingle();
  if (!mission) {
    return { success: false, error: "Mission introuvable." };
  }
  if (mission.statut === "annulee" || mission.statut === "terminee") {
    return { success: false, error: "Cette mission ne peut plus être annulée." };
  }

  const { error } = await admin.from("missions").update({ statut: "annulee" }).eq("id", missionId);
  if (error) {
    return { success: false, error: error.message };
  }

  const { data: paiement } = await admin
    .from("paiements")
    .select("statut, stripe_payment_intent_id")
    .eq("mission_id", missionId)
    .maybeSingle();

  if (paiement && paiement.statut === "sequestre") {
    await admin
      .from("paiements")
      .update({ statut: "rembourse", date_deblocage: new Date().toISOString() })
      .eq("mission_id", missionId);

    if (paiement.stripe_payment_intent_id) {
      try {
        const stripe = getStripeClient();
        await stripe.refunds.create({ payment_intent: paiement.stripe_payment_intent_id });
      } catch {
        // Best-effort — voir annulerMission pour le même choix.
      }
    }
  }

  await journaliser({
    adminId: session.userId,
    action: "mission_annulee_admin",
    cibleType: "mission",
    cibleId: missionId,
    motif,
    details: { ancien_statut: mission.statut },
  });

  const destinataires = [mission.recruteur_id, ...(await prestataireUserIds(admin, missionId))];
  await Promise.all(
    destinataires.map((userId) =>
      Promise.all([
        creerNotification({
          userId,
          type: "mission_annulee",
          titre: "Mission annulée",
          contenu: `Un administrateur a annulé cette mission : ${motif.trim()}`,
          lien: `/missions/${missionId}`,
          missionId,
        }),
        creerMessageSysteme({
          missionId,
          expediteurId: session.userId,
          destinataireId: userId,
          contenu: `❌ Un administrateur a annulé cette mission : ${motif.trim()}`,
        }),
      ]),
    ),
  );

  revalidatePath("/admin/missions");
  return { success: true };
}

/** Ouvre un litige côté admin (ex. signalement reçu hors du flux recruteur standard). */
export async function ouvrirLitigeMissionAdmin(missionId: string, motif: string): Promise<ActionResult> {
  if (!motif.trim()) {
    return { success: false, error: "Le motif est obligatoire." };
  }

  const session = await requireAdminSession();
  const admin = createAdminClient();

  const { data: mission } = await admin.from("missions").select("id, statut, recruteur_id").eq("id", missionId).maybeSingle();
  if (!mission) {
    return { success: false, error: "Mission introuvable." };
  }
  if (mission.statut === "annulee") {
    return { success: false, error: "Cette mission est annulée, elle ne peut pas passer en litige." };
  }

  const { error } = await admin
    .from("missions")
    .update({ statut: "litige", motif_litige: motif.trim() })
    .eq("id", missionId);
  if (error) {
    return { success: false, error: error.message };
  }

  await journaliser({
    adminId: session.userId,
    action: "litige_ouvert_admin",
    cibleType: "mission",
    cibleId: missionId,
    motif,
  });

  const destinataires = [mission.recruteur_id, ...(await prestataireUserIds(admin, missionId))];
  await Promise.all(
    destinataires.map((userId) =>
      creerNotification({
        userId,
        type: "litige",
        titre: "Litige ouvert",
        contenu: `Un administrateur a ouvert un litige sur cette mission : ${motif.trim()}`,
        lien: `/missions/${missionId}`,
        missionId,
      }),
    ),
  );

  revalidatePath("/admin/missions");
  return { success: true };
}
