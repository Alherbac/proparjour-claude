import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getNotifications } from "@/lib/notifications";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { Logo } from "@/components/layout/logo";
import { NotificationBell } from "@/components/layout/notification-bell";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/actions/auth";

/**
 * Chrome commun (en-tête + navigation basse) du tableau de bord,
 * partagé entre les deux miroirs prestataire et recruteur — seule la
 * navigation basse change de contenu selon le rôle (BottomNav).
 */
export default async function TableauDeBordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/connexion?next=/tableau-de-bord");
  }

  const { data: profil } = await supabase
    .from("users")
    .select("type")
    .eq("id", user.id)
    .maybeSingle();

  if (profil?.type !== "prestataire" && profil?.type !== "recruteur_entreprise" && profil?.type !== "recruteur_particulier") {
    return <>{children}</>;
  }

  const role = profil.type === "prestataire" ? "prestataire" : "recruteur";
  const notifications = await getNotifications();

  return (
    <div className="min-h-full bg-secondary/30 pb-24">
      <header className="border-b border-border bg-background px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            <NotificationBell userId={user.id} notificationsInitiales={notifications} />
            <form action={signOutAction}>
              <Button type="submit" variant="ghost" size="sm">
                Se déconnecter
              </Button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-6">{children}</div>
      <BottomNav role={role} />
    </div>
  );
}
