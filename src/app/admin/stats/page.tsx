import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import { ModuleAVenir } from "@/components/admin/module-a-venir";

export const metadata: Metadata = { title: "Statistiques — Admin ProParJour" };

export default async function AdminStatsPage() {
  await requireAdminSession();
  return <ModuleAVenir titre="Statistiques" lot="Lot 5 — Pilotage stats" />;
}
