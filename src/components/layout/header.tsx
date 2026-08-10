import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { HeaderShell } from "@/components/layout/header-shell";
import { MarketingLogo } from "@/components/marketing/marketing-logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { PanierIndicator } from "@/components/layout/panier-indicator";
import { NotificationBell } from "@/components/layout/notification-bell";
import { Button } from "@/components/ui/button";
import {
  LANDING_BTN_BASE,
  LANDING_BTN_HEADER_SIZE,
  LANDING_BTN_PRIMARY,
} from "@/components/marketing/button-styles";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { getNotifications } from "@/lib/notifications";

const NAV_LINKS = [
  { href: "/#comment", label: "Comment ça marche" },
  { href: "/#recruter", label: "Entreprises" },
  { href: "/prestataires", label: "Prestataires" },
];

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const notifications = user ? await getNotifications() : [];

  return (
    <HeaderShell>
      <div className="mx-auto flex h-[76px] max-w-[1200px] items-center justify-between px-10 max-[900px]:px-6">
        <MarketingLogo />

        <nav className="flex items-center gap-9 max-[900px]:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-ink/62 transition-opacity hover:opacity-100 hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <PanierIndicator />
          {user ? (
            <>
              <NotificationBell userId={user.id} notificationsInitiales={notifications} />
              <Button
                render={<Link href="/tableau-de-bord" />}
                className={cn(LANDING_BTN_BASE, LANDING_BTN_PRIMARY, LANDING_BTN_HEADER_SIZE)}
              >
                <LayoutDashboard className="size-4" />
                Tableau de bord
              </Button>
            </>
          ) : (
            <>
              <Button
                render={<Link href="/inscription" />}
                className={cn(LANDING_BTN_BASE, LANDING_BTN_PRIMARY, LANDING_BTN_HEADER_SIZE)}
              >
                Créer mon compte
              </Button>
              <Link
                href="/connexion"
                className="hidden text-sm font-medium text-ink/62 transition-opacity hover:opacity-100 hover:text-ink sm:block"
              >
                Me connecter
              </Link>
            </>
          )}
        </div>
      </div>
    </HeaderShell>
  );
}
