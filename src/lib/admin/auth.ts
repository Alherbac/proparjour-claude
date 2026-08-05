import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AdminRole } from "@/lib/supabase/database.types";

export type AdminSession = {
  userId: string;
  prenom: string | null;
  role: AdminRole;
};

/**
 * Vérifie seulement l'authentification + le rôle (admin ou
 * modérateur), via has_role() (RLS-safe). Utilisée par le layout
 * (protège tout le back-office, y compris les pages d'enrôlement 2FA
 * elles-mêmes) et par requireAdminSession ci-dessous.
 */
export async function requireAdminRole(): Promise<AdminSession> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion?next=/admin");
  }

  const [{ data: estAdmin }, { data: estModerateur }] = await Promise.all([
    supabase.rpc("has_role", { check_role: "admin" }),
    supabase.rpc("has_role", { check_role: "moderator" }),
  ]);

  if (!estAdmin && !estModerateur) {
    redirect("/");
  }

  const { data: profil } = await supabase
    .from("users")
    .select("prenom")
    .eq("id", user.id)
    .maybeSingle();

  return {
    userId: user.id,
    prenom: profil?.prenom ?? null,
    role: estAdmin ? "admin" : "moderator",
  };
}

/**
 * Porte d'entrée des pages métier du back-office : rôle + 2FA
 * obligatoire (cahier des charges §4.1). Ne jamais appeler depuis
 * /admin/parametres ou /admin/verification-2fa (boucle de
 * redirection sur elles-mêmes) — ces deux-là utilisent
 * requireAdminRole seul.
 */
export async function requireAdminSession(): Promise<AdminSession> {
  const session = await requireAdminRole();
  const supabase = await createClient();

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
    redirect("/admin/verification-2fa");
  }

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const aFactorVerifie = (factors?.totp ?? []).some((f) => f.status === "verified");
  if (!aFactorVerifie) {
    redirect("/admin/parametres?configurer2fa=1");
  }

  return session;
}
