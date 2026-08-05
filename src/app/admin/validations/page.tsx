import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import { ModuleAVenir } from "@/components/admin/module-a-venir";

export const metadata: Metadata = { title: "Validation — Admin ProParJour" };

export default async function AdminValidationsPage() {
  await requireAdminSession();
  return <ModuleAVenir titre="Validation" lot="Lot 2 — Conformité" />;
}
