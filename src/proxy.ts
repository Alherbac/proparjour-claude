import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function estRouteReserveeRecruteurs(pathname: string) {
  return pathname === "/" || pathname.startsWith("/prestataires");
}

/**
 * Rafraîchit le cookie de session Supabase à chaque requête, comme
 * recommandé par @supabase/ssr pour l'App Router. Vérifie aussi
 * qu'un prestataire connecté n'accède pas à la landing page ni à la
 * recherche/fiche publique d'autres prestataires — il ne recrute
 * personne, seules ses missions le concernent (voir
 * `/tableau-de-bord/missions`). Le reste des vérifications
 * d'autorisation se fait toujours page par page via
 * lib/supabase/server.ts.
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && estRouteReserveeRecruteurs(request.nextUrl.pathname)) {
    const [{ data: profil }, { data: estAdmin }, { data: estModerateur }] = await Promise.all([
      supabase.from("users").select("type").eq("id", user.id).maybeSingle(),
      supabase.rpc("has_role", { check_role: "admin" }),
      supabase.rpc("has_role", { check_role: "moderator" }),
    ]);

    // Un administrateur/modérateur garde accès à ces pages (utile
    // pour consulter la recherche recruteur telle qu'un visiteur la
    // voit) — seule la redirection par défaut de "/" vers /admin,
    // gérée page par page, s'applique à lui.
    if (profil?.type === "prestataire" && !estAdmin && !estModerateur) {
      return NextResponse.redirect(new URL("/tableau-de-bord/accueil", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
