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
