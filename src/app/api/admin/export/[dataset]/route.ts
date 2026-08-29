import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { construireCsv } from "@/lib/csv";

const DATASETS = ["missions", "paiements", "utilisateurs"] as const;
type Dataset = (typeof DATASETS)[number];

/**
 * Export CSV admin (cahier des charges §3.10, module "Export données").
 * `utilisateurs` contient des données personnelles (email, téléphone) —
 * réservé au rôle admin, contrairement aux deux autres jeux de
 * données (missions/paiements) ouverts aussi aux modérateurs comme le
 * reste du back-office.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ dataset: string }> }) {
  const { dataset } = await params;
  if (!DATASETS.includes(dataset as Dataset)) {
    return NextResponse.json({ error: "Jeu de données inconnu." }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const [{ data: estAdmin }, { data: estModerateur }] = await Promise.all([
    supabase.rpc("has_role", { check_role: "admin" }),
    supabase.rpc("has_role", { check_role: "moderator" }),
  ]);
  if (!estAdmin && !estModerateur) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }
  if (dataset === "utilisateurs" && !estAdmin) {
    return NextResponse.json({ error: "Export réservé aux administrateurs." }, { status: 403 });
  }

  const admin = createAdminClient();
  let csv: string;

  if (dataset === "missions") {
    const { data } = await admin
      .from("missions")
      .select("id, date_mission, lieu, statut, montant_total, created_at")
      .order("created_at", { ascending: false });
    csv = construireCsv(["id", "date_mission", "lieu", "statut", "montant_total", "created_at"], data ?? []);
  } else if (dataset === "paiements") {
    const { data } = await admin
      .from("paiements")
      .select("mission_id, montant, statut, taux_commission, montant_commission, created_at")
      .order("created_at", { ascending: false });
    csv = construireCsv(
      ["mission_id", "montant", "statut", "taux_commission", "montant_commission", "created_at"],
      data ?? [],
    );
  } else {
    const { data: utilisateurs } = await admin
      .from("users")
      .select("id, type, prenom, nom, telephone, ville, created_at")
      .order("created_at", { ascending: false });
    const emails = await Promise.all(
      (utilisateurs ?? []).map(async (u) => {
        const { data: authUser } = await admin.auth.admin.getUserById(u.id);
        return [u.id, authUser?.user?.email ?? ""] as const;
      }),
    );
    const emailParId = new Map(emails);
    const lignes = (utilisateurs ?? []).map((u) => ({ ...u, email: emailParId.get(u.id) ?? "" }));
    csv = construireCsv(["id", "type", "prenom", "nom", "email", "telephone", "ville", "created_at"], lignes);
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="proparjour-${dataset}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
