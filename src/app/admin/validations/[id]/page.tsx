import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminSession } from "@/lib/admin/auth";
import { getDossierKyc } from "@/lib/admin/kyc";
import { KycDossierDetail } from "@/components/admin/kyc-dossier-detail";
import { AdminH1 } from "@/components/admin/ui/section";

export const metadata: Metadata = { title: "Dossier — Admin ProParJour" };

export default async function AdminValidationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminSession();
  const { id } = await params;
  const dossier = await getDossierKyc(id);
  if (!dossier) notFound();

  return (
    <div>
      <Link
        href="/admin/validations"
        className="inline-flex items-center gap-1.5 text-[13px] text-[var(--a-text-2)] transition-colors hover:text-[var(--a-ink)]"
      >
        ← Retour à la file d&apos;attente
      </Link>
      <div className="mt-2">
        <AdminH1>
          Dossier de {dossier.user.prenom} {dossier.user.nom}
        </AdminH1>
      </div>
      <div className="mt-4">
        <KycDossierDetail dossier={dossier} />
      </div>
    </div>
  );
}
