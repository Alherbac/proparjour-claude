import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import { ModuleAVenir } from "@/components/admin/module-a-venir";

export const metadata: Metadata = { title: "Missions — Admin ProParJour" };

export default async function AdminMissionsPage() {
  await requireAdminSession();
  return <ModuleAVenir titre="Missions" lot="Lot 3 — Opérations" />;
}
