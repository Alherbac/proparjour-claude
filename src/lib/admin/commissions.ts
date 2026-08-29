import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type CommissionParStatut = { statut: string; montant: number; nb: number };

export type ResumeCommissions = {
  tauxActuel: number;
  totalPercuLibere: number;
  totalEnAttente: number;
  parStatut: CommissionParStatut[];
};

/** Vue d'ensemble des commissions — historique agrégé par statut de paiement (cahier des charges §3.10, "historique des commissions perçues"). */
export async function getResumeCommissions(): Promise<ResumeCommissions> {
  const admin = createAdminClient();
  const [{ data: parametres }, { data: paiements }] = await Promise.all([
    admin.from("parametres_commission").select("taux").eq("id", true).maybeSingle(),
    admin.from("paiements").select("statut, montant_commission"),
  ]);

  const compteur = new Map<string, { montant: number; nb: number }>();
  for (const p of paiements ?? []) {
    const cur = compteur.get(p.statut) ?? { montant: 0, nb: 0 };
    cur.montant += p.montant_commission;
    cur.nb += 1;
    compteur.set(p.statut, cur);
  }

  const parStatut = [...compteur.entries()]
    .map(([statut, v]) => ({ statut, montant: Math.round(v.montant * 100) / 100, nb: v.nb }))
    .sort((a, b) => b.montant - a.montant);

  return {
    tauxActuel: parametres?.taux ?? 15,
    totalPercuLibere: Math.round((compteur.get("libere")?.montant ?? 0) * 100) / 100,
    totalEnAttente: Math.round((compteur.get("sequestre")?.montant ?? 0) * 100) / 100,
    parStatut,
  };
}
