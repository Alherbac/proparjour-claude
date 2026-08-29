"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { journaliser } from "@/lib/admin/audit";
import { traduireErreurDb } from "@/lib/erreurs-db";

type ActionResult = { success: true } | { success: false; error: string };

/** Modifie le taux de commission global appliqué aux nouvelles missions (cahier des charges §3.10) — n'affecte jamais les missions déjà créées, leur `paiements.taux_commission` reste figé. */
export async function modifierTauxCommission(taux: number): Promise<ActionResult> {
  const session = await requireAdminSession();
  if (session.role !== "admin") {
    return { success: false, error: "Seul un administrateur peut modifier le taux de commission." };
  }
  if (!Number.isFinite(taux) || taux < 0 || taux > 100) {
    return { success: false, error: "Le taux doit être compris entre 0 et 100." };
  }

  const admin = createAdminClient();
  const { data: avant } = await admin.from("parametres_commission").select("taux").eq("id", true).maybeSingle();

  const { error } = await admin
    .from("parametres_commission")
    .update({ taux, updated_at: new Date().toISOString(), updated_by: session.userId })
    .eq("id", true);
  if (error) {
    return { success: false, error: traduireErreurDb(error, "Impossible de modifier le taux de commission pour le moment.") };
  }

  await journaliser({
    adminId: session.userId,
    action: "taux_commission_modifie",
    cibleType: "parametres_commission",
    cibleId: session.userId,
    details: { ancien_taux: avant?.taux ?? null, nouveau_taux: taux },
  });

  revalidatePath("/admin/commissions");
  return { success: true };
}
