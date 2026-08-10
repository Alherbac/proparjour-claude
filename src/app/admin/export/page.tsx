import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import { ModuleAVenir } from "@/components/admin/module-a-venir";

export const metadata: Metadata = { title: "Export données — Admin ProParJour" };

export default async function AdminExportPage() {
  await requireAdminSession();
  return <ModuleAVenir titre="Export données" lot="Lot 6 — Outils" />;
}
