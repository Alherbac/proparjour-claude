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

function tauxValide(taux: number): boolean {
  return Number.isFinite(taux) && taux >= 0 && taux <= 40;
}

async function verifierAdmin() {
  const session = await requireAdminSession();
  if (session.role !== "admin") throw new Error("PERMISSION");
  return session;
}

async function agirTaux(
  table: "taux_commission_metier" | "taux_commission_prestataire" | "taux_frais_segment_client" | "taux_frais_client",
  cle: { colonne: string; valeur: string },
  taux: number | null,
  action: string,
): Promise<ActionResult> {
  let session;
  try {
    session = await verifierAdmin();
  } catch {
    return { success: false, error: "Seul un administrateur peut modifier un taux." };
  }
  if (taux !== null && !tauxValide(taux)) {
    return { success: false, error: "Le taux doit être compris entre 0 et 40." };
  }

  const admin = createAdminClient();
  if (taux === null) {
    const { error } = await admin.from(table).delete().eq(cle.colonne, cle.valeur);
    if (error) return { success: false, error: traduireErreurDb(error) };
  } else {
    const { error } = await admin
      .from(table)
      .upsert({ [cle.colonne]: cle.valeur, taux, updated_at: new Date().toISOString(), updated_by: session.userId } as never, { onConflict: cle.colonne });
    if (error) return { success: false, error: traduireErreurDb(error) };
  }

  await journaliser({
    adminId: session.userId,
    action: "taux_commission_modifie",
    cibleType: table,
    cibleId: cle.valeur,
    details: { action, taux },
  });
  revalidatePath("/admin/commissions");
  return { success: true };
}

export async function setTauxMetier(metier: string, taux: number) {
  return agirTaux("taux_commission_metier", { colonne: "metier", valeur: metier }, taux, "metier_defini");
}
export async function retablirTauxMetier(metier: string) {
  return agirTaux("taux_commission_metier", { colonne: "metier", valeur: metier }, null, "metier_retabli");
}
export async function setTauxPrestataireIndividuel(prestataireId: string, taux: number) {
  return agirTaux("taux_commission_prestataire", { colonne: "prestataire_id", valeur: prestataireId }, taux, "prestataire_defini");
}
export async function retablirTauxPrestataireIndividuel(prestataireId: string) {
  return agirTaux("taux_commission_prestataire", { colonne: "prestataire_id", valeur: prestataireId }, null, "prestataire_retabli");
}
export async function setTauxSegment(segment: string, taux: number) {
  return agirTaux("taux_frais_segment_client", { colonne: "segment", valeur: segment }, taux, "segment_defini");
}
export async function retablirTauxSegment(segment: string) {
  return agirTaux("taux_frais_segment_client", { colonne: "segment", valeur: segment }, null, "segment_retabli");
}
export async function setTauxClientIndividuel(recruteurId: string, taux: number) {
  return agirTaux("taux_frais_client", { colonne: "recruteur_id", valeur: recruteurId }, taux, "client_defini");
}
export async function retablirTauxClientIndividuel(recruteurId: string) {
  return agirTaux("taux_frais_client", { colonne: "recruteur_id", valeur: recruteurId }, null, "client_retabli");
}

type RechercheResult = { id: string; nom: string; sousLabel: string };

/** Recherche légère pour les pickers "Ajouter un taux individuel" (§5.7). */
export async function rechercherPrestatairesPourTaux(q: string): Promise<{ success: true; data: RechercheResult[] } | { success: false; error: string }> {
  await requireAdminSession();
  if (!q.trim() || q.trim().length < 2) return { success: true, data: [] };
  const admin = createAdminClient();
  const { data: users } = await admin.from("users").select("id, prenom, nom").eq("type", "prestataire").or(`prenom.ilike.%${q.trim()}%,nom.ilike.%${q.trim()}%`).limit(10);
  if (!users || users.length === 0) return { success: true, data: [] };
  const { data: profils } = await admin.from("prestataires_profils").select("id, user_id, metier").in("user_id", users.map((u) => u.id));
  const profilParUser = new Map((profils ?? []).map((p) => [p.user_id, p]));
  return {
    success: true,
    data: users
      .map((u) => {
        const profil = profilParUser.get(u.id);
        if (!profil) return null;
        return { id: profil.id, nom: `${u.prenom ?? ""} ${u.nom ?? ""}`.trim() || "Prestataire", sousLabel: profil.metier as string };
      })
      .filter((r): r is RechercheResult => r !== null),
  };
}

export async function rechercherClientsPourTaux(q: string): Promise<{ success: true; data: RechercheResult[] } | { success: false; error: string }> {
  await requireAdminSession();
  if (!q.trim() || q.trim().length < 2) return { success: true, data: [] };
  const admin = createAdminClient();
  const { data: users } = await admin
    .from("users")
    .select("id, prenom, nom, type")
    .in("type", ["recruteur_particulier", "recruteur_entreprise"])
    .or(`prenom.ilike.%${q.trim()}%,nom.ilike.%${q.trim()}%`)
    .limit(10);
  return {
    success: true,
    data: (users ?? []).map((u) => ({
      id: u.id,
      nom: `${u.prenom ?? ""} ${u.nom ?? ""}`.trim() || "Client",
      sousLabel: u.type === "recruteur_entreprise" ? "Entreprise" : "Particulier",
    })),
  };
}
