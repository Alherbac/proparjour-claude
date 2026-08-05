import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import { ModuleAVenir } from "@/components/admin/module-a-venir";

export const metadata: Metadata = { title: "Commissions — Admin ProParJour" };

export default async function AdminCommissionsPage() {
  await requireAdminSession();
  return <ModuleAVenir titre="Commissions" lot="Lot 4 — Finances (adapté au séquestre simple)" />;
}
