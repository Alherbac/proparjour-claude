import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import { ModuleAVenir } from "@/components/admin/module-a-venir";

export const metadata: Metadata = { title: "Messages — Admin ProParJour" };

export default async function AdminMessagesPage() {
  await requireAdminSession();
  return <ModuleAVenir titre="Messages" lot="Lot 6 — Support" />;
}
