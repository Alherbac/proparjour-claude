import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMissionsPrestataire } from "@/lib/missions";

export const metadata: Metadata = {
  title: "Mon argent — ProParJour",
};

export default async function ArgentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/tableau-de-bord/argent");

  const lignes = await getMissionsPrestataire(user.id);
  // Une mission annulée est remboursée au recruteur — le prestataire
  // n'a rien reçu et rien n'est en attente pour lui sur cette ligne,
  // elle n'a donc rien à faire dans "Mon argent".
  const avecPaiement = lignes
    .filter((l) => l.paiement?.statut === "sequestre" || l.paiement?.statut === "libere")
    .sort((a, b) => b.mission.date_mission.localeCompare(a.mission.date_mission));

  const totalEnAttente = avecPaiement
    .filter((l) => l.paiement?.statut === "sequestre")
    .reduce((s, l) => s + l.tarif_applique, 0);
  const totalRecu = avecPaiement
    .filter((l) => l.paiement?.statut === "libere")
    .reduce((s, l) => s + l.tarif_applique, 0);

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-semibold text-foreground">Mon argent</h1>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">En attente</p>
          <p className="font-heading text-xl font-semibold text-foreground">
            {totalEnAttente.toFixed(2)} €
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Reçu</p>
          <p className="font-heading text-xl font-semibold text-foreground">{totalRecu.toFixed(2)} €</p>
        </div>
      </div>

      <div className="space-y-2">
        {avecPaiement.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Rien à afficher pour l&apos;instant.
          </p>
        )}
        {avecPaiement.map((ligne) => (
          <div
            key={ligne.id}
            className="flex items-center justify-between rounded-2xl border border-border bg-background p-4 shadow-sm"
          >
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <CalendarDays className="size-4 text-muted-foreground" />
                {ligne.mission.date_mission}
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">{ligne.mission.lieu}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-foreground">{ligne.tarif_applique} €</p>
              <p className="text-xs text-muted-foreground">
                {ligne.paiement?.statut === "sequestre" ? "En attente" : "Reçu"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
