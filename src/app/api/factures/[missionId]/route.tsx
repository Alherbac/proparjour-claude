import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getMissionPourFacture } from "@/lib/missions";
import { FacturePDF } from "@/lib/facture-pdf";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ missionId: string }> },
) {
  const { missionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const mission = await getMissionPourFacture(missionId);
  if (!mission) {
    return NextResponse.json({ error: "Mission introuvable." }, { status: 404 });
  }
  // Durci (suivi d'exécution, 2026-09-17) : cette facture montre le
  // montant TOTAL payé par le recruteur — jamais destinée à un
  // prestataire (voir /api/factures/[missionId]/prestataire pour son
  // propre justificatif, qui ne montre que sa part). S'appuyait déjà
  // implicitement sur la RLS de `paiements` (mission.paiement reste
  // null pour un non-recruteur), mais sans ce contrôle explicite un
  // prestataire recevait un 400 confus plutôt qu'un refus clair.
  if (mission.recruteur_id !== user.id) {
    return NextResponse.json({ error: "Cette facture ne vous est pas accessible." }, { status: 403 });
  }
  if (!mission.paiement || mission.paiement.statut === "en_attente" || mission.paiement.statut === "echec") {
    return NextResponse.json(
      { error: "Aucun paiement confirmé pour cette mission." },
      { status: 400 },
    );
  }

  const { data: profil } = await supabase
    .from("users")
    .select("prenom, nom")
    .eq("id", user.id)
    .maybeSingle();
  const { data: entreprise } = await supabase
    .from("entreprises")
    .select("raison_sociale")
    .eq("user_id", user.id)
    .maybeSingle();

  const factureA =
    entreprise?.raison_sociale || `${profil?.prenom ?? ""} ${profil?.nom ?? ""}`.trim() || user.email || "Client ProParJour";

  const buffer = await renderToBuffer(<FacturePDF mission={mission} factureA={factureA} />);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="facture-${missionId.slice(0, 8)}.pdf"`,
    },
  });
}
