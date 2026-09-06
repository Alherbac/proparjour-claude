import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import {
  getTauxParMetier,
  getTauxIndividuelsPrestataires,
  getMissionsAvecCommissionPrestataire,
  getTauxParSegment,
  getTauxIndividuelsClients,
  getMissionsAvecFraisClient,
} from "@/lib/admin/commissions";
import { CommissionsScreen } from "@/components/admin/commissions-screen";

export const metadata: Metadata = { title: "Commissions — Admin ProParJour" };

export default async function AdminCommissionsPage() {
  await requireAdminSession();
  const [tauxMetier, individuelsPrestataires, missionsPrestataires, tauxSegment, individuelsClients, missionsClients] = await Promise.all([
    getTauxParMetier(),
    getTauxIndividuelsPrestataires(),
    getMissionsAvecCommissionPrestataire(),
    getTauxParSegment(),
    getTauxIndividuelsClients(),
    getMissionsAvecFraisClient(),
  ]);

  return (
    <CommissionsScreen
      tauxMetier={tauxMetier}
      individuelsPrestataires={individuelsPrestataires}
      missionsPrestataires={missionsPrestataires}
      tauxSegment={tauxSegment}
      individuelsClients={individuelsClients}
      missionsClients={missionsClients}
    />
  );
}
