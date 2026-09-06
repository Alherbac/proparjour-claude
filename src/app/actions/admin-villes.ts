"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { journaliser } from "@/lib/admin/audit";
import { traduireErreurDb } from "@/lib/erreurs-db";

type ActionResult = { success: true } | { success: false; error: string };

export async function creerVilleAdmin(nom: string, codeZone: string): Promise<ActionResult> {
  const session = await requireAdminSession();
  if (!nom.trim() || !codeZone.trim()) {
    return { success: false, error: "Le nom et la zone sont obligatoires." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("villes_admin")
    .insert({ nom: nom.trim(), code_zone: codeZone.trim(), created_by: session.userId })
    .select("id")
    .single();
  if (error) return { success: false, error: traduireErreurDb(error, "Impossible de créer cette ville pour le moment.") };

  await journaliser({ adminId: session.userId, action: "ville_creee", cibleType: "ville", cibleId: data.id, details: { nom: nom.trim() } });
  revalidatePath("/admin/villes");
  return { success: true };
}

export async function basculerVilleAdmin(id: string, active: boolean): Promise<ActionResult> {
  const session = await requireAdminSession();
  const admin = createAdminClient();
  const { error } = await admin.from("villes_admin").update({ active }).eq("id", id);
  if (error) return { success: false, error: traduireErreurDb(error, "Impossible de mettre à jour cette ville pour le moment.") };

  await journaliser({
    adminId: session.userId,
    action: active ? "ville_activee" : "ville_desactivee",
    cibleType: "ville",
    cibleId: id,
  });
  revalidatePath("/admin/villes");
  return { success: true };
}
