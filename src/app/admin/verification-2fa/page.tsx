import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdminRole } from "@/lib/admin/auth";
import { Verification2FAForm } from "@/components/admin/verification-2fa-form";

export const metadata: Metadata = {
  title: "Vérification — Admin ProParJour",
};

export default async function Verification2FAPage() {
  await requireAdminRole();
  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = (factors?.totp ?? []).find((f) => f.status === "verified");

  if (!factor) {
    redirect("/admin/parametres?configurer2fa=1");
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="font-heading text-2xl font-semibold text-foreground">Vérification en deux étapes</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Saisis le code à 6 chiffres de ton application d&apos;authentification.
      </p>
      <div className="mt-4">
        <Verification2FAForm factorId={factor.id} />
      </div>
    </div>
  );
}
