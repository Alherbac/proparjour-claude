import type Stripe from "stripe";
import { getStripeClient } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { creerNotification } from "@/lib/notifications";
import { finaliserCommandeAvecLignes, type LigneReservation } from "@/app/actions/commande";
import { confirmerPaiementMissionAvecIntent } from "@/app/actions/paiement-mission";

/**
 * Filet de sécurité serveur-à-serveur pour tout ce que le navigateur
 * du recruteur peut manquer : onglet fermé juste après un paiement
 * pourtant réussi (payment_intent.succeeded), ou un remboursement
 * déclenché hors de notre propre code — depuis le dashboard Stripe
 * directement, par exemple (charge.refunded). Les deux parcours
 * "normaux" (finaliserCommande, confirmerPaiementMission, déclenchés
 * par le client) restent le chemin principal ; ce webhook ne fait que
 * rejouer la même logique si elle n'a jamais eu lieu.
 *
 * Next.js App Router ne parse jamais le body pour les routes API —
 * request.text() donne le corps brut, obligatoire pour que la
 * vérification de signature Stripe (qui hache les octets exacts
 * envoyés) soit valide.
 */
export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !secret) {
    return new Response("Webhook non configuré.", { status: 500 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    return new Response(`Signature invalide : ${err instanceof Error ? err.message : String(err)}`, { status: 400 });
  }

  const admin = createAdminClient();

  // Déduplication au niveau de l'événement Stripe lui-même (livraison
  // "at-least-once" : un même event.id peut être renvoyé plusieurs
  // fois). Seule une violation de clé primaire (23505 — event déjà
  // présent) signifie "déjà traité, répondre 200 sans rejouer". Toute
  // AUTRE erreur (ex. 42P01 si la migration 0034 n'a pas encore été
  // exécutée) doit faire échouer bruyamment la requête plutôt que
  // d'être confondue avec un doublon — sinon chaque événement webhook
  // se tait silencieusement, en apparence "traité", sans que rien ne
  // se soit réellement passé (bug trouvé en direct : c'est exactement
  // ce qui se produisait avant ce correctif).
  const { error: dedupError } = await admin
    .from("webhook_events_traites")
    .insert({ event_id: event.id, type: event.type });
  if (dedupError) {
    if (dedupError.code === "23505") {
      return new Response("Événement déjà traité.", { status: 200 });
    }
    return new Response(`Déduplication indisponible : ${dedupError.message}`, { status: 500 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const intent = event.data.object as Stripe.PaymentIntent;
        await traiterPaiementReussi(intent);
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        await traiterRemboursement(charge);
        break;
      }
      default:
        // Type reçu mais non géré ici — accusé de réception normal,
        // Stripe ne doit pas réessayer indéfiniment un événement que
        // ce endpoint ne traite délibérément pas.
        break;
    }
  } catch (err) {
    // Une erreur de TRAITEMENT (pas de signature) doit faire échouer
    // la réponse pour que Stripe réessaie plus tard — l'entrée de
    // déduplication ci-dessus a déjà été écrite, donc le retry Stripe
    // repasserait ce garde-fou. Pour rester rejouable en cas d'échec
    // transitoire, on retire l'entrée avant de renvoyer l'erreur.
    await admin.from("webhook_events_traites").delete().eq("event_id", event.id);
    return new Response(`Erreur de traitement : ${err instanceof Error ? err.message : String(err)}`, { status: 500 });
  }

  return new Response("ok", { status: 200 });
}

async function traiterPaiementReussi(intent: Stripe.PaymentIntent) {
  const admin = createAdminClient();
  const missionId = intent.metadata?.mission_id;
  const recruteurId = intent.metadata?.recruteur_id;

  if (missionId && recruteurId) {
    // Parcours "devis en messagerie" (paiement-mission.ts) — la
    // mission existe déjà, il ne reste qu'à confirmer le paiement.
    const result = await confirmerPaiementMissionAvecIntent(missionId, intent.id, recruteurId);
    if (!result.success) throw new Error(result.error);
    return;
  }

  // Parcours "panier" (commande.ts) — les lignes ne vivent que dans le
  // localStorage du navigateur, donc uniquement récupérables ici via
  // le snapshot écrit par creerIntentionPaiement.
  const { data: commande } = await admin
    .from("commandes_en_attente")
    .select("recruteur_id, lignes")
    .eq("payment_intent_id", intent.id)
    .maybeSingle();

  if (!commande) {
    // Ni mission_id (devis) ni snapshot panier : événement Stripe pour
    // un paiement qui n'a pas été initié par ce code (ou snapshot pas
    // encore écrit — condition de course avec creerIntentionPaiement,
    // improbable mais pas impossible). Rien à faire de sûr ici.
    return;
  }

  const result = await finaliserCommandeAvecLignes(intent.id, commande.lignes as LigneReservation[], commande.recruteur_id);
  if (!result.success) throw new Error(result.error);
}

async function traiterRemboursement(charge: Stripe.Charge) {
  const admin = createAdminClient();
  const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!paymentIntentId) return;

  const { data: paiement } = await admin
    .from("paiements")
    .select("mission_id, statut")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();
  if (!paiement || paiement.statut === "rembourse") return;

  await admin
    .from("paiements")
    .update({ statut: "rembourse", date_deblocage: new Date().toISOString() })
    .eq("mission_id", paiement.mission_id);

  const { data: mission } = await admin
    .from("missions")
    .select("recruteur_id, lieu, date_mission")
    .eq("id", paiement.mission_id)
    .maybeSingle();
  if (!mission) return;

  // Pas de creerMessageSysteme ici : ce webhook capture aussi les
  // remboursements déclenchés hors de notre propre flux d'annulation
  // (ex. depuis le dashboard Stripe directement) — il n'y a pas
  // d'acteur clair à qui attribuer un message dans le fil de
  // conversation. Une notification suffit pour prévenir chaque partie.
  const { data: lignes } = await admin.from("mission_lignes").select("prestataire_id").eq("mission_id", paiement.mission_id);
  const prestataireIds = [...new Set((lignes ?? []).map((l) => l.prestataire_id))];
  const { data: profils } =
    prestataireIds.length > 0
      ? await admin.from("prestataires_profils").select("user_id").in("id", prestataireIds)
      : { data: [] as { user_id: string }[] };

  await Promise.all([
    creerNotification({
      userId: mission.recruteur_id,
      type: "mission_statut_modifie",
      titre: "Remboursement confirmé",
      contenu: `${mission.lieu} — ${mission.date_mission}`,
      lien: `/missions/${paiement.mission_id}`,
      missionId: paiement.mission_id,
    }),
    ...(profils ?? []).map((p) =>
      creerNotification({
        userId: p.user_id,
        type: "mission_statut_modifie",
        titre: "Paiement remboursé au client",
        contenu: `${mission.lieu} — ${mission.date_mission}`,
        lien: `/missions/${paiement.mission_id}`,
        missionId: paiement.mission_id,
      }),
    ),
  ]);
}
