import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import { ModuleAVenir } from "@/components/admin/module-a-venir";

export const metadata: Metadata = { title: "Simulation — Admin ProParJour" };

export default async function AdminSimulationPage() {
  await requireAdminSession();
  return <ModuleAVenir titre="Simulation" lot="Lot 6 — Support" />;
}
