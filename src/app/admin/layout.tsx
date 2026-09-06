import type { Metadata } from "next";
import { Syne, DM_Sans } from "next/font/google";
import { AdminShellClient } from "@/components/admin/shell/admin-shell-client";
import { requireAdminRole } from "@/lib/admin/auth";
import { getFileAttenteKyc, statutAffiche } from "@/lib/admin/kyc";
import { getNombreDemandesSuppressionEnAttente } from "@/lib/admin/suppressions";
import { getNombreMessagesNonTraites } from "@/lib/admin/messages";
import { listerPrestatairesSimulables } from "@/lib/admin/utilisateurs";
import "./admin-theme.css";

// Polices propres à /admin (§2 : "aucune autre police") — chargées ici
// plutôt que dans src/app/layout.tsx pour ne pas toucher au thème
// global (Règle n°0). Next.js applique les variables uniquement sur
// le sous-arbre de ce layout.
const syne = Syne({ variable: "--font-admin-syne", subsets: ["latin"], weight: ["600", "700", "800"] });
const dmSans = DM_Sans({ variable: "--font-admin-dm-sans", subsets: ["latin"], weight: ["400", "500", "700"] });

// Audit final — double protection avec le Disallow de robots.ts : même
// si une URL /admin/* était un jour découverte (lien externe, etc.),
// jamais indexée.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [session, dossiers, suppressionsEnAttente, messagesNonTraites, prestatairesSimulables] = await Promise.all([
    requireAdminRole(),
    getFileAttenteKyc(),
    getNombreDemandesSuppressionEnAttente(),
    getNombreMessagesNonTraites(),
    listerPrestatairesSimulables(),
  ]);
  // Même logique que l'onglet "À traiter" par défaut de KycQueue — le
  // badge doit correspondre exactement à ce que l'admin voit en
  // arrivant sur /admin/validations.
  const aTraiter = dossiers.filter((d) => {
    const statut = statutAffiche(d);
    return statut !== "valide" && statut !== "refuse";
  }).length;

  return (
    <div className={`${syne.variable} ${dmSans.variable} h-screen`}>
      <AdminShellClient
        badges={{ validations: aTraiter, messages: messagesNonTraites, suppressions: suppressionsEnAttente }}
        nomComplet={session.prenom || "Administrateur"}
        roleLabel={session.role === "admin" ? "Administrateur" : "Modérateur"}
        prestatairesSimulables={prestatairesSimulables}
      >
        {children}
      </AdminShellClient>
    </div>
  );
}
