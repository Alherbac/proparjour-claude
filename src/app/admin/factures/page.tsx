import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import { ModuleAVenir } from "@/components/admin/module-a-venir";

export const metadata: Metadata = { title: "Factures — Admin ProParJour" };

export default async function AdminFacturesPage() {
  await requireAdminSession();
  return <ModuleAVenir titre="Factures" lot="Lot 4 — Finances (adapté au séquestre simple)" />;
}
