import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import { ModuleAVenir } from "@/components/admin/module-a-venir";

export const metadata: Metadata = { title: "CGU — Admin ProParJour" };

export default async function AdminCguPage() {
  await requireAdminSession();
  return <ModuleAVenir titre="CGU" lot="Lot 2 — Conformité" />;
}
