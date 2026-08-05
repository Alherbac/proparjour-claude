import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import { ModuleAVenir } from "@/components/admin/module-a-venir";

export const metadata: Metadata = { title: "Suppressions — Admin ProParJour" };

export default async function AdminSuppressionsPage() {
  await requireAdminSession();
  return <ModuleAVenir titre="Suppressions" lot="Lot 2 — Conformité" />;
}
