import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cheminInterneOuNull } from "@/lib/redirection";

/**
 * Callback OAuth (Google) : échange le code contre une session, puis
 * renvoie l'utilisateur sur le formulaire d'inscription d'où il est
 * parti pour qu'il complète son profil (métier, type de compte...) —
 * OAuth ne fournit que l'e-mail et le nom, pas nos champs métier.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Filtré (audit prod I2) : `next` ne peut être qu'un chemin interne —
  // `origin` n'ayant pas de "/" final, un `next` type "@evil.com" ou
  // "//evil.com" produirait sinon une redirection ouverte.
  const next = cheminInterneOuNull(searchParams.get("next")) ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}${next}?erreur=oauth`);
}
