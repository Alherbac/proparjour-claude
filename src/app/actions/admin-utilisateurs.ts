"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { journaliser } from "@/lib/admin/audit";

type ActionResult = { success: true } | { success: false; error: string };

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
