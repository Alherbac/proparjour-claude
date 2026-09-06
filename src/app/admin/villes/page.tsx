import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import { getVillesAdmin } from "@/lib/admin/pilotage";
import { VillesScreen } from "@/components/admin/villes-screen";

export const metadata: Metadata = { title: "Villes — Admin ProParJour" };

export default async function AdminVillesPage() {
  await requireAdminSession();
  const villes = await getVillesAdmin();
  return <VillesScreen villes={villes} />;
}
