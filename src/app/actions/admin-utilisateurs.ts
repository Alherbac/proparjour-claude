"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { journaliser } from "@/lib/admin/audit";
import { creerNotification } from "@/lib/notifications";
import { getFicheUtilisateur, type FicheUtilisateur } from "@/lib/admin/utilisateurs";

type ActionResult = { success: true } | { success: false; error: string };
type ActionResultData<T> = { success: true; data: T } | { success: false; error: string };

/** Chargée à la demande, au clic sur une ligne (§6) — évite une requête par ligne au chargement de la liste. */
export async function chargerFicheUtilisateur(userId: string): Promise<ActionResultData<FicheUtilisateur | null>> {
  await requireAdminSession();
  const fiche = await getFicheUtilisateur(userId);
  return { success: true, data: fiche };
}

// Bannir un compte est une action sensible et difficile à faire
// suivre correctement par un modérateur (impact direct sur l'accès
// utilisateur) — réservée à l'admin, contrairement au reste du
// back-office ouvert admin+modérateur.
const DUREE_BAN = "876000h"; // ~100 ans — l'API Supabase Auth n'a pas de "ban permanent" dédié

export async function suspendreUtilisateur(userId: string, motif: string): Promise<ActionResult> {
  const session = await requireAdminSession();
  if (session.role !== "admin") {
    return { success: false, error: "Seul un administrateur peut suspendre un compte." };
  }
  if (!motif.trim()) {
    return { success: false, error: "Le motif est obligatoire." };
  }
  if (userId === session.userId) {
    return { success: false, error: "Vous ne pouvez pas suspendre votre propre compte." };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: DUREE_BAN });
  if (error) {
    return { success: false, error: "Impossible de suspendre ce compte pour le moment." };
  }

  await journaliser({
    adminId: session.userId,
    action: "utilisateur_suspendu",
    cibleType: "utilisateur",
    cibleId: userId,
    motif,
  });

  revalidatePath("/admin/utilisateurs");
  return { success: true };
}

export async function reactiverUtilisateur(userId: string): Promise<ActionResult> {
  const session = await requireAdminSession();
  if (session.role !== "admin") {
    return { success: false, error: "Seul un administrateur peut réactiver un compte." };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: "none" });
  if (error) {
    return { success: false, error: "Impossible de réactiver ce compte pour le moment." };
  }

  await journaliser({
    adminId: session.userId,
    action: "utilisateur_reactive",
    cibleType: "utilisateur",
    cibleId: userId,
  });

  revalidatePath("/admin/utilisateurs");
  return { success: true };
}

/**
 * Message admin générique vers un compte (notification in-app —
 * aucun envoi d'e-mail réel n'est câblé dans ce lot, voir rapport
 * final). Apparaît ensuite dans "Messages administrateur" du panneau
 * (getFicheUtilisateur, type="message_admin").
 */
export async function envoyerMessageAdminUtilisateur(userId: string, sujet: string, contenu: string): Promise<ActionResult> {
  const session = await requireAdminSession();
  if (!sujet.trim()) {
    return { success: false, error: "Le sujet est obligatoire." };
  }

  await creerNotification({
    userId,
    type: "message_admin",
    titre: sujet.trim(),
    contenu: contenu.trim() || undefined,
  });

  await journaliser({
    adminId: session.userId,
    action: "message_admin_envoye",
    cibleType: "utilisateur",
    cibleId: userId,
    details: { sujet: sujet.trim() },
  });

  revalidatePath("/admin/utilisateurs");
  return { success: true };
}
