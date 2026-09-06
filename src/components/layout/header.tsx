import Link from "next/link";
import { HeaderShell } from "@/components/layout/header-shell";
import { MarketingLogo } from "@/components/marketing/marketing-logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { PanierIndicator } from "@/components/layout/panier-indicator";
import { NotificationBell } from "@/components/layout/notification-bell";
import { MobileNav } from "@/components/layout/mobile-nav";
import { createClient } from "@/lib/supabase/server";
import { getNotifications } from "@/lib/notifications";

// Refonte Claude Istanbul 1, §4.1 : "Les métiers" / "Comment ça
// marche" / "Vous êtes professionnel" — mêmes ancres que les
// sections de la landing (Lot 2+).
const NAV_LINKS = [
  { href: "/#metiers", label: "Les métiers" },
  { href: "/#fonctionnement", label: "Comment ça marche" },
  { href: "/#professionnels", label: "Vous êtes professionnel" },
];

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const notifications = user ? await getNotifications() : [];
  const profil = user
    ? (await supabase.from("users").select("prenom, nom, type").eq("id", user.id).maybeSingle()).data
    : null;
  const initiales =
    ((profil?.prenom?.[0] ?? "") + (profil?.nom?.[0] ?? "")).toUpperCase() ||
    (user?.email ? user.email.slice(0, 2).toUpperCase() : "?");
  // Un prestataire connecté qui atterrit sur une page marketing (ex.
  // /prestataires) revient à son propre espace via le logo, jamais à
  // la landing client.
  const espaceHref = profil?.type === "prestataire" ? "/prestataire" : profil?.type === "admin" ? "/admin" : "/client";
  const logoHref = profil?.type === "prestataire" ? "/prestataire" : "/";

  return (
    <HeaderShell>
      <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-2 px-6 py-3.5 max-[400px]:px-4">
        <MarketingLogo className="max-[360px]:text-[18px]" href={logoHref} />

        <nav className="flex items-center gap-9 max-[900px]:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[14.5px] font-medium text-ppj-text-2 transition-colors hover:text-ppj-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex min-w-0 shrink items-center gap-2.5 max-[400px]:gap-1.5">
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          <PanierIndicator />
          {user ? (
            <>
              <NotificationBell userId={user.id} notificationsInitiales={notifications} voirToutHref={`${espaceHref}/notifications`} />
              <Link
                href={espaceHref}
                className="hidden text-[14.5px] font-medium text-ppj-text-2 transition-colors hover:text-ppj-ink max-[900px]:hidden sm:block"
              >
                Vos missions
              </Link>
              <Link
                href={espaceHref}
                className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-ppj-ink text-[13px] font-semibold text-white"
                aria-label="Mon compte"
              >
                {initiales}
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/connexion"
                className="text-[14.5px] font-medium text-ppj-text-2 transition-colors hover:text-ppj-ink max-[900px]:hidden"
              >
                Se connecter
              </Link>
              <Link
                href="/inscription"
                className="whitespace-nowrap rounded-[10px] bg-ppj-ink px-4 py-2.5 text-[14.5px] font-semibold text-white transition-colors hover:bg-primary max-[400px]:px-3 max-[400px]:text-[12.5px]"
              >
                Créer un compte
              </Link>
            </>
          )}
          <div className="min-[900px]:hidden">
            <MobileNav estConnecte={Boolean(user)} />
          </div>
        </div>
      </div>
    </HeaderShell>
  );
}
