import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserType } from "@/lib/supabase/database.types";

export const UTILISATEURS_PAR_PAGE = 20;

export type UtilisateurListe = {
  id: string;
  type: UserType | null;
  prenom: string | null;
  nom: string | null;
  telephone: string | null;
  ville: string | null;
  createdAt: string;
  email: string | null;
  suspendu: boolean;
};

/**
 * Liste paginée des utilisateurs (§3.10, "Fiches utilisateurs
 * consultables"). L'email et le statut de suspension viennent de
 * Supabase Auth (jamais dupliqués dans `public.users`, voir 0001 —
 * `users` n'a pas de colonne email) : on ne les résout que pour la
 * page courante, jamais pour la table entière, pour rester rapide
 * même avec beaucoup d'utilisateurs.
 */
export async function listeUtilisateurs(params: {
  q?: string;
  type?: UserType | "tous";
  page?: number;
}): Promise<{ utilisateurs: UtilisateurListe[]; total: number; totalPages: number }> {
  const admin = createAdminClient();
  const page = Math.max(1, params.page ?? 1);
  const from = (page - 1) * UTILISATEURS_PAR_PAGE;
  const to = from + UTILISATEURS_PAR_PAGE - 1;

  let query = admin.from("users").select("*", { count: "exact" }).order("created_at", { ascending: false });
  if (params.type && params.type !== "tous") {
    query = query.eq("type", params.type);
  }
  if (params.q?.trim()) {
    const q = params.q.trim();
    query = query.or(`prenom.ilike.%${q}%,nom.ilike.%${q}%`);
  }

  const { data, count } = await query.range(from, to);
  const lignes = data ?? [];

  const authInfos = await Promise.all(
    lignes.map(async (u) => {
      const { data: authUser } = await admin.auth.admin.getUserById(u.id);
      return {
        id: u.id,
        email: authUser?.user?.email ?? null,
        suspendu: Boolean(authUser?.user?.banned_until && new Date(authUser.user.banned_until) > new Date()),
      };
    }),
  );
  const authParId = new Map(authInfos.map((a) => [a.id, a]));

  const utilisateurs: UtilisateurListe[] = lignes.map((u) => ({
    id: u.id,
    type: u.type,
    prenom: u.prenom,
    nom: u.nom,
    telephone: u.telephone,
    ville: u.ville,
    createdAt: u.created_at,
    email: authParId.get(u.id)?.email ?? null,
    suspendu: authParId.get(u.id)?.suspendu ?? false,
  }));

  const total = count ?? 0;
  return { utilisateurs, total, totalPages: Math.max(1, Math.ceil(total / UTILISATEURS_PAR_PAGE)) };
}

const TYPES_NOTIFICATIONS_ADMIN = [
  "document_demande",
  "profil_valide",
  "profil_refuse",
  "message_admin",
  "mission_statut_modifie",
  "paiement_libere",
  "mission_annulee",
  "litige",
];

export type FicheUtilisateur = {
  id: string;
  type: UserType | null;
  prenom: string | null;
  nom: string | null;
  telephone: string | null;
  ville: string | null;
  createdAt: string;
  email: string | null;
  suspendu: boolean;
  profilId: string | null;
  documents: { type: string; label: string; statut: string; expire?: string | null }[];
  messages: { titre: string; contenu: string | null; createdAt: string }[];
};

/** Fiche complète d'un utilisateur — alimente le panneau latéral (§6) sur /admin/utilisateurs. */
export async function getFicheUtilisateur(userId: string): Promise<FicheUtilisateur | null> {
  const admin = createAdminClient();
  const { data: u } = await admin.from("users").select("*").eq("id", userId).maybeSingle();
  if (!u) return null;

  const [{ data: authUser }, { data: notifs }] = await Promise.all([
    admin.auth.admin.getUserById(userId),
    admin
      .from("notifications")
      .select("titre, contenu, created_at, type")
      .eq("user_id", userId)
      .in("type", TYPES_NOTIFICATIONS_ADMIN)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  let profilId: string | null = null;
  let documents: FicheUtilisateur["documents"] = [];
  if (u.type === "prestataire") {
    const { data: profil } = await admin
      .from("prestataires_profils")
      .select("id, metier")
      .eq("user_id", userId)
      .maybeSingle();
    if (profil) {
      profilId = profil.id;
      const { DOCUMENTS_REQUIS } = await import("@/config/documents-requis");
      const { data: justificatifs } = await admin.from("justificatifs").select("type_document, statut").eq("prestataire_id", profil.id);
      const requis = DOCUMENTS_REQUIS[profil.metier] ?? [];
      documents = requis.map((r) => {
        const j = (justificatifs ?? []).find((j) => j.type_document === r.type);
        return { type: r.type, label: r.label, statut: j?.statut ?? "non_fourni" };
      });
    }
  }

  return {
    id: u.id,
    type: u.type,
    prenom: u.prenom,
    nom: u.nom,
    telephone: u.telephone,
    ville: u.ville,
    createdAt: u.created_at,
    email: authUser?.user?.email ?? null,
    suspendu: Boolean(authUser?.user?.banned_until && new Date(authUser.user.banned_until) > new Date()),
    profilId,
    documents,
    messages: (notifs ?? []).map((n) => ({ titre: n.titre, contenu: n.contenu, createdAt: n.created_at })),
  };
}

export type PrestataireSimulable = { profilId: string; nom: string; metier: string };

/**
 * Liste légère des prestataires validés — sert uniquement au
 * sélecteur "Mode simulation" (voir admin-shell-client.tsx) : ouvrir
 * leur fiche publique dans le contexte du bandeau de simulation.
 */
export async function listerPrestatairesSimulables(): Promise<PrestataireSimulable[]> {
  const admin = createAdminClient();
  const { data: profils } = await admin
    .from("prestataires_profils")
    .select("id, user_id, metier")
    .eq("statut_verification", "valide")
    .order("created_at", { ascending: false })
    .limit(300);
  if (!profils || profils.length === 0) return [];

  const userIds = profils.map((p) => p.user_id);
  const { data: users } = await admin.from("users").select("id, prenom, nom").in("id", userIds);
  const userParId = new Map((users ?? []).map((u) => [u.id, u]));

  return profils.map((p) => {
    const u = userParId.get(p.user_id);
    return {
      profilId: p.id,
      nom: u ? `${u.prenom ?? ""} ${u.nom ?? ""}`.trim() || "Prestataire" : "Prestataire",
      metier: p.metier,
    };
  });
}
