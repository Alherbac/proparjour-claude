import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import { getTauxCommission } from "@/lib/commission";
import { SimulationScreen } from "@/components/admin/simulation-screen";

export const metadata: Metadata = { title: "Simulation — Admin ProParJour" };

export default async function AdminSimulationPage() {
  await requireAdminSession();
  const tauxActuel = await getTauxCommission();
  return <SimulationScreen tauxActuel={tauxActuel} />;
}
