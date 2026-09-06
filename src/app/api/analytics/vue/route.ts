import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifierLimiteDebit, ipRequete } from "@/lib/rate-limit";

/**
 * Ingestion d'une vue de page — appelée par le tracker client
 * (src/components/analytics-tracker.tsx), uniquement si le visiteur a
 * consenti à la mesure d'audience (cookie-consent.ts). Aucune lecture
 * n'est exposée ici : la lecture passe par les fonctions admin
 * (service_role), jamais par cette route.
 */
export async function POST(request: Request) {
  const ip = await ipRequete();
  // Un visiteur qui navigue vite peut légitimement dépasser une
  // limite basse — 120 vues / 5 min reste large pour un usage normal
  // tout en bloquant un script qui spammerait la table.
  if (!(await verifierLimiteDebit(`visite:${ip}`, 120, 5 * 60))) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  let body: { chemin?: unknown; sessionId?: unknown; appareil?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const chemin = typeof body.chemin === "string" ? body.chemin.slice(0, 300) : null;
  const sessionId = typeof body.sessionId === "string" ? body.sessionId.slice(0, 100) : null;
  const appareil = body.appareil === "mobile" ? "mobile" : "desktop";
  if (!chemin || !sessionId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const admin = createAdminClient();
  await admin.from("visites").insert({ chemin, session_id: sessionId, appareil });

  return NextResponse.json({ ok: true });
}
