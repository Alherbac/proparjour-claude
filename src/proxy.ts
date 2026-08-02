import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Rafraîchit le cookie de session Supabase à chaque requête, comme
 * recommandé par @supabase/ssr pour l'App Router. Ne fait aucune
 * vérification d'autorisation ici — chaque page/route protégée doit
 * vérifier elle-même l'utilisateur via lib/supabase/server.ts.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Le projet Supabase n'est pas encore configuré : on laisse passer
  // les requêtes sans rafraîchir de session plutôt que de planter le
  // site. À retirer une fois les variables d'environnement définies.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
