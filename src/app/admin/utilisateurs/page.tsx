import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import { ModuleAVenir } from "@/components/admin/module-a-venir";

export const metadata: Metadata = { title: "Utilisateurs — Admin ProParJour" };

export default async function AdminUtilisateursPage() {
  await requireAdminSession();
  return <ModuleAVenir titre="Utilisateurs" lot="Lot 2 — Conformité" />;
}
