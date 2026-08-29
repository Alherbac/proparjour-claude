import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import { getResumeCommissions } from "@/lib/admin/commissions";
import { CommissionsScreen } from "@/components/admin/commissions-screen";

export const metadata: Metadata = { title: "Commissions — Admin ProParJour" };

export default async function AdminCommissionsPage() {
  const session = await requireAdminSession();
  const resume = await getResumeCommissions();
  return <CommissionsScreen resume={resume} peutModifier={session.role === "admin"} />;
}
