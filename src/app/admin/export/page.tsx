import type { Metadata } from "next";
import { Download, Briefcase, Wallet, Users } from "lucide-react";
import { requireAdminSession } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Export données — Admin ProParJour" };

export default async function AdminExportPage() {
  const session = await requireAdminSession();

  const jeux = [
    { id: "missions", label: "Missions", description: "Date, lieu, statut, montant.", icon: Briefcase, accessible: true },
    { id: "paiements", label: "Paiements", description: "Montant, statut, commission.", icon: Wallet, accessible: true },
    {
      id: "utilisateurs",
      label: "Utilisateurs",
      description: "Profil, email, téléphone — données personnelles, réservé aux administrateurs.",
      icon: Users,
      accessible: session.role === "admin",
    },
  ] as const;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display-serif text-2xl text-foreground">Export données</h1>
        <p className="mt-1 text-sm text-muted-foreground">Export CSV des principaux jeux de données de la plateforme.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {jeux.map((jeu) => (
          <div key={jeu.id} className="flex flex-col rounded-2xl border border-border bg-background p-5">
            <jeu.icon className="size-6 text-muted-foreground" />
            <h2 className="mt-3 text-sm font-semibold text-foreground">{jeu.label}</h2>
            <p className="mt-1 flex-1 text-xs text-muted-foreground">{jeu.description}</p>
            {jeu.accessible ? (
              <a
                href={`/api/admin/export/${jeu.id}`}
                className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40"
              >
                <Download className="size-3.5" />
                Télécharger le CSV
              </a>
            ) : (
              <p className="mt-4 text-xs text-muted-foreground">Réservé aux administrateurs.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
