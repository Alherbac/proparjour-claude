import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import { getDemandesSuppressionEnAttente } from "@/lib/admin/suppressions";
import { SuppressionsScreen } from "@/components/admin/suppressions-screen";

export const metadata: Metadata = { title: "Suppressions — Admin ProParJour" };

export default async function AdminSuppressionsPage() {
  await requireAdminSession();
  const demandes = await getDemandesSuppressionEnAttente();
  return <SuppressionsScreen demandes={demandes} />;
}
