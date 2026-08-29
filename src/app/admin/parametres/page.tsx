import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireAdminRole } from "@/lib/admin/auth";
import { TwoFactorSetup } from "@/components/admin/two-factor-setup";

export const metadata: Metadata = {
  title: "Paramètres — Admin ProParJour",
};

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-5 shadow-sm">
      <h2 className="font-heading text-lg font-semibold text-foreground">{titre}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export default async function AdminParametresPage() {
  await requireAdminRole();
  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const dejaActivee = (factors?.totp ?? []).some((f) => f.status === "verified");

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display-serif text-2xl text-foreground">Paramètres</h1>

      <Section titre="Double authentification">
        <TwoFactorSetup dejaActivee={dejaActivee} />
      </Section>

      <Section titre="Journal d'activité, sécurité, configuration">
        <p className="text-sm text-muted-foreground">
          Journal des actions admin, seuils de score, modèles d&apos;e-mail — prévu au Lot 6.
        </p>
      </Section>
    </div>
  );
}
