import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";

export const metadata: Metadata = {
  title: "Tableau de bord — Admin ProParJour",
};

export default async function AdminAccueilPage() {
  const session = await requireAdminSession();

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold text-foreground">Tableau de bord</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Bonjour {session.prenom || ""} — la vue d&apos;ensemble (dossiers en attente, missions à
        démarrer, litiges, CA) sera construite avec les Lots 2 et 3, une fois qu&apos;il y aura de
        vraies données à afficher.
      </p>
    </div>
  );
}
