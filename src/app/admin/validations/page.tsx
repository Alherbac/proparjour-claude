import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import { getFileAttenteKyc } from "@/lib/admin/kyc";
import { ValidationsScreen } from "@/components/admin/validations-screen";

export const metadata: Metadata = { title: "Validation des profils — Admin ProParJour" };

export default async function AdminValidationsPage() {
  await requireAdminSession();
  const dossiers = await getFileAttenteKyc();
  return <ValidationsScreen dossiers={dossiers} />;
}
