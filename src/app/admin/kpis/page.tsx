import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import { ModuleAVenir } from "@/components/admin/module-a-venir";

export const metadata: Metadata = { title: "KPI stratégiques — Admin ProParJour" };

export default async function AdminKpisPage() {
  await requireAdminSession();
  return <ModuleAVenir titre="KPI stratégiques" lot="Lot 5 — Pilotage stats" />;
}
