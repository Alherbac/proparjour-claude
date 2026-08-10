import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { signOutAction } from "@/app/actions/auth";
import { requireAdminRole } from "@/lib/admin/auth";
import { getFileAttenteKyc, statutAffiche } from "@/lib/admin/kyc";

const ROLE_LABELS = { admin: "Administrateur", moderator: "Modérateur" } as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [session, dossiers] = await Promise.all([requireAdminRole(), getFileAttenteKyc()]);
  // Même logique que l'onglet "À traiter" par défaut de KycQueue — le
  // badge doit correspondre exactement à ce que l'admin voit en
  // arrivant sur /admin/validations.
  const aTraiter = dossiers.filter((d) => {
    const statut = statutAffiche(d);
    return statut !== "valide" && statut !== "refuse";
  }).length;

  return (
    <div className="flex min-h-screen bg-secondary/30">
      <AdminSidebar badges={{ validations: aTraiter }} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-background px-6 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">Bonjour {session.prenom || ""}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="font-normal">
              {ROLE_LABELS[session.role]}
            </Badge>
            <form action={signOutAction}>
              <Button type="submit" variant="ghost" size="sm">
                Se déconnecter
              </Button>
            </form>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
