import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import { ModuleAVenir } from "@/components/admin/module-a-venir";

export const metadata: Metadata = { title: "Pilotage & Alertes — Admin ProParJour" };

export default async function AdminPilotagePage() {
  await requireAdminSession();
  return <ModuleAVenir titre="Pilotage & Alertes" lot="Lot 0 (après Conformité et Opérations)" />;
}
