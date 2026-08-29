import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import { getOffreDemandeParVille } from "@/lib/admin/pilotage";
import { VillesScreen } from "@/components/admin/villes-screen";

export const metadata: Metadata = { title: "Villes / zones — Admin ProParJour" };

export default async function AdminVillesPage() {
  await requireAdminSession();
  const villes = await getOffreDemandeParVille();
  return <VillesScreen villes={villes} />;
}
