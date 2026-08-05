import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import { ModuleAVenir } from "@/components/admin/module-a-venir";

export const metadata: Metadata = { title: "Villes / zones — Admin ProParJour" };

export default async function AdminVillesPage() {
  await requireAdminSession();
  return <ModuleAVenir titre="Villes / zones" lot="Lot 2 — Conformité" />;
}
