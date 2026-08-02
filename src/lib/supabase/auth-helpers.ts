import { createClient } from "@/lib/supabase/client";

/**
 * Lance le flux OAuth Google. `next` est le chemin où revenir une
 * fois la session créée (le callback y redirige) — généralement la
 * page d'inscription d'où l'utilisateur est parti, pour qu'il
 * complète les champs métier que Google ne fournit pas.
 */
export async function signInWithGoogle(next: string) {
  const supabase = createClient();
  const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });

  return { error };
}
