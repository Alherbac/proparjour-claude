import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireAdminRole } from "@/lib/admin/auth";
import { listerJournalAudit } from "@/lib/admin/audit";
import { ParametresScreen } from "@/components/admin/parametres-screen";

export const metadata: Metadata = { title: "Paramètres — Admin ProParJour" };

export default async function AdminParametresPage() {
  await requireAdminRole();
  const supabase = await createClient();
  const [{ data: factors }, journal] = await Promise.all([supabase.auth.mfa.listFactors(), listerJournalAudit()]);
  const dejaActivee = (factors?.totp ?? []).some((f) => f.status === "verified");

  return <ParametresScreen dejaActivee2fa={dejaActivee} journal={journal} />;
}
