import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const RESEND_API_URL = "https://api.resend.com/emails";
const EXPEDITEUR = "ProParJour <notifications@proparjour.fr>";
const BASE_URL = "https://proparjour.fr";

/**
 * Catégorie B, point 13 — notifications email a minima. Best-effort,
 * comme creerNotification (lib/notifications.ts) : un envoi qui
 * échoue (clé absente, Resend indisponible) ne doit jamais faire
 * échouer l'action métier qui l'a déclenché. `RESEND_API_KEY` absente
 * = fonctionnalité simplement inactive plutôt qu'erreur, même
 * principe fail-open que getStripeClient/getTauxCommission.
 */
async function envoyerEmail(params: { to: string; subject: string; html: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  try {
    await fetch(RESEND_API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: EXPEDITEUR, to: [params.to], subject: params.subject, html: params.html }),
    });
  } catch {
    // Volontairement ignoré — voir commentaire ci-dessus.
  }
}

function gabaritEmail(titre: string, corps: string, lien?: { href: string; label: string }): string {
  return `<div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
    <p style="font-weight: 700; font-size: 18px; color: #C0392B; margin: 0 0 24px;">ProParJour</p>
    <h1 style="font-size: 20px; margin: 0 0 12px;">${titre}</h1>
    <p style="font-size: 15px; line-height: 1.6; color: #444;">${corps}</p>
    ${
      lien
        ? `<p style="margin-top: 20px;"><a href="${BASE_URL}${lien.href}" style="background: #C0392B; color: #fff; padding: 10px 20px; border-radius: 999px; text-decoration: none; font-size: 14px; font-weight: 600;">${lien.label}</a></p>`
        : ""
    }
  </div>`;
}

async function emailUtilisateur(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.auth.admin.getUserById(userId);
  return data?.user?.email ?? null;
}

/** Nouvelle offre correspondant au profil d'un prestataire (cahier des charges §3.8). */
export async function envoyerEmailNouvelleOffre(userId: string, titreOffre: string, detail: string): Promise<void> {
  const email = await emailUtilisateur(userId);
  if (!email) return;
  await envoyerEmail({
    to: email,
    subject: `Nouvelle offre de mission — ${titreOffre}`,
    html: gabaritEmail("Nouvelle offre de mission", `${titreOffre} — ${detail}`, {
      href: "/prestataire/opportunites",
      label: "Voir l'offre",
    }),
  });
}

/** Mission confirmée — toutes les lignes ont été acceptées (recruteur notifié). */
export async function envoyerEmailMissionConfirmee(userId: string, lieu: string, dateMission: string, missionId: string): Promise<void> {
  const email = await emailUtilisateur(userId);
  if (!email) return;
  await envoyerEmail({
    to: email,
    subject: "Mission confirmée",
    html: gabaritEmail("Votre mission est confirmée", `${lieu} — ${dateMission}. Tous les prestataires ont accepté.`, {
      href: `/missions/${missionId}`,
      label: "Voir la mission",
    }),
  });
}

/** Paiement débloqué au prestataire après confirmation du service fait. */
export async function envoyerEmailPaiementDebloque(userId: string, missionId: string): Promise<void> {
  const email = await emailUtilisateur(userId);
  if (!email) return;
  await envoyerEmail({
    to: email,
    subject: "Paiement débloqué",
    html: gabaritEmail(
      "Votre paiement a été débloqué",
      "Le recruteur a confirmé le service fait, votre paiement a été débloqué.",
      { href: `/missions/${missionId}`, label: "Voir la mission" },
    ),
  });
}
