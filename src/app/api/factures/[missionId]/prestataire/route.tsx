import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getLignePourFacturePrestataire } from "@/lib/missions";
import { FacturePDFPrestataire } from "@/lib/facture-pdf";

/**
 * Justificatif de versement du PRESTATAIRE — jamais le même document
 * que /api/factures/[missionId] (facture client, montant total) :
 * celui-ci ne montre que sa propre part, jamais le montant payé par
 * le recruteur ni la part d'un autre prestataire sur la même mission
 * (voir getLignePourFacturePrestataire, lib/missions.ts).
 */
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

  const ligne = await getLignePourFacturePrestataire(missionId, user.id);
  if (!ligne) {
    return NextResponse.json(
      { error: "Aucun paiement débloqué pour cette mission, ou cette mission ne vous concerne pas." },
      { status: 400 },
    );
  }

  const { data: profil } = await supabase.from("users").select("prenom, nom").eq("id", user.id).maybeSingle();
  const factureA = `${profil?.prenom ?? ""} ${profil?.nom ?? ""}`.trim() || user.email || "Prestataire ProParJour";

  const buffer = await renderToBuffer(<FacturePDFPrestataire ligne={ligne} factureA={factureA} />);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="justificatif-${missionId.slice(0, 8)}.pdf"`,
    },
  });
}
