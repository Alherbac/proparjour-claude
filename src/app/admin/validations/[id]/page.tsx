import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminSession } from "@/lib/admin/auth";
import { getDossierKyc } from "@/lib/admin/kyc";
import { KycDossierDetail } from "@/components/admin/kyc-dossier-detail";

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
      <Link href="/admin/validations" className="text-sm text-muted-foreground hover:text-foreground">
        ← Retour à la file d&apos;attente
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-semibold text-foreground">
        Dossier de {dossier.user.prenom} {dossier.user.nom}
      </h1>
      <div className="mt-4">
        <KycDossierDetail dossier={dossier} />
      </div>
    </div>
  );
}
