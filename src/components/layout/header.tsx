import Link from "next/link";
import { Bell, LayoutDashboard } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { PanierIndicator } from "@/components/layout/panier-indicator";
import { NotificationBell } from "@/components/layout/notification-bell";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getNotifications } from "@/lib/notifications";

const NAV_LINKS = [
  { href: "/prestataires", label: "Prestataire" },
  { href: "/entreprises", label: "Entreprise" },
  { href: "/contact", label: "Contact" },
];

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const notifications = user ? await getNotifications() : [];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3 lg:px-8">
        <Logo />

        <nav className="ml-auto hidden items-center gap-6 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 lg:ml-0">
          <ThemeToggle />
          <PanierIndicator />
          {user ? (
            <NotificationBell userId={user.id} notificationsInitiales={notifications} />
          ) : (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Notifications"
              className="rounded-full text-muted-foreground"
            >
              <Bell className="size-5" />
            </Button>
          )}
          <Button
            render={<Link href="/tableau-de-bord" />}
            className="ml-2 rounded-full"
          >
            <LayoutDashboard className="size-4" />
            Tableau de bord
          </Button>
        </div>
      </div>
    </header>
  );
}
