import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import { ModuleAVenir } from "@/components/admin/module-a-venir";

export const metadata: Metadata = { title: "Offres — Admin ProParJour" };

export default async function AdminOffresPage() {
  await requireAdminSession();
  return <ModuleAVenir titre="Offres" lot="Lot 3 — Opérations" />;
}
