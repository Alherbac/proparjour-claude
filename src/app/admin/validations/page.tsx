import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import { getFileAttenteKyc } from "@/lib/admin/kyc";
import { KycQueue } from "@/components/admin/kyc-queue";

export const metadata: Metadata = { title: "Validation — Admin ProParJour" };

export default async function AdminValidationsPage() {
  await requireAdminSession();
  const dossiers = await getFileAttenteKyc();

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold text-foreground">Validation</h1>
      <div className="mt-4">
        <KycQueue dossiers={dossiers} />
      </div>
    </div>
  );
}
