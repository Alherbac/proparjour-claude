import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import { getVersementsAVerser, getVersementsEffectues } from "@/lib/admin/versements";
import { VersementsScreen } from "@/components/admin/versements-screen";
import { AdminH1 } from "@/components/admin/ui/section";

export const metadata: Metadata = { title: "Versements — Admin ProParJour" };

export default async function AdminVersementsPage() {
  await requireAdminSession();
  const [aVerser, effectues] = await Promise.all([getVersementsAVerser(), getVersementsEffectues()]);

  return (
    <div>
      <AdminH1>Versements</AdminH1>
      <p className="mt-1 text-[13px] text-[var(--a-text-2)]">
        Suivi des virements manuels aux prestataires — modèle de paiement en séquestre simple, sans Stripe Connect.
        Un paiement « libéré » ne devient « versé » que lorsqu&apos;il est confirmé ici.
      </p>
      <div className="mt-6">
        <VersementsScreen aVerser={aVerser} effectues={effectues} />
      </div>
    </div>
  );
}
