import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { NotificationsRow } from "@/lib/supabase/database.types";

export type NotificationType =
  | "mission_proposee"
  | "mission_acceptee"
  | "mission_refusee"
  | "mission_annulee"
  | "mission_statut_modifie"
  | "service_fait_declare"
  | "paiement_libere"
  | "litige"
  | "nouveau_message"
  | "document_demande"
  | "profil_valide"
  | "profil_refuse"
  | "offre_correspondante"
  | "candidature_recue"
  | "candidature_acceptee"
  | "candidature_refusee"
  | "offre_cloturee"
  | "nouvel_avis"
  | "devis_envoye"
  | "devis_accepte"
  | "devis_ajustement_demande"
  | "devis_refuse"
  | "message_admin"
  | "mission_debut_declare"
  | "mission_debut_confirme"
  | "mission_debut_conteste"
  | "mission_fin_declaree"
  | "mission_horaires_confirmes"
  | "mission_horaires_contestes"
  | "facture_disponible";

/**
 * Best-effort : une notification qui échoue à s'écrire ne doit jamais
 * faire échouer l'action métier qui l'a déclenchée (accepter une
 * mission doit réussir même si, par exemple, la table notifications
 * est momentanément indisponible).
 */
export async function creerNotification(params: {
  userId: string;
  type: NotificationType;
  titre: string;
  contenu?: string;
  lien?: string;
  missionId?: string;
}) {
  try {
    const admin = createAdminClient();
    await admin.from("notifications").insert({
      user_id: params.userId,
      type: params.type,
      titre: params.titre,
      contenu: params.contenu ?? null,
      lien: params.lien ?? null,
      mission_id: params.missionId ?? null,
    });
  } catch {
    // Volontairement ignoré — voir commentaire ci-dessus.
  }
}

/**
 * Notifications de l'utilisateur courant, via le client session (RLS) —
 * la policy "notifications_select_own_ou_admin" garantit qu'on ne peut
 * récupérer que ses propres notifications.
 */
export async function getNotifications(limite = 20): Promise<NotificationsRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limite);
  return data ?? [];
}
