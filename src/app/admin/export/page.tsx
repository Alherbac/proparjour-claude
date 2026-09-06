import type { Metadata } from "next";
import { Download, Briefcase, Wallet, Users, Megaphone, FileText, Archive } from "lucide-react";
import { requireAdminSession } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminH1 } from "@/components/admin/ui/section";
import { AdminBadge } from "@/components/admin/ui/badge";

export const metadata: Metadata = { title: "Export données — Admin ProParJour" };

export default async function AdminExportPage() {
  const session = await requireAdminSession();
  const admin = createAdminClient();

  const [missions, paiements, utilisateurs, offres, justificatifs] = await Promise.all([
    admin.from("missions").select("*", { count: "exact", head: true }),
    admin.from("paiements").select("*", { count: "exact", head: true }),
    admin.from("users").select("*", { count: "exact", head: true }),
    admin.from("offres").select("*", { count: "exact", head: true }),
    admin.from("justificatifs").select("*", { count: "exact", head: true }),
  ]);

  const jeux = [
    { id: "missions", label: "Missions", description: "Date, lieu, statut, montant.", icon: Briefcase, count: missions.count ?? 0, accessible: true },
    { id: "paiements", label: "Paiements", description: "Montant, statut, commission.", icon: Wallet, count: paiements.count ?? 0, accessible: true },
    { id: "offres", label: "Offres", description: "Titre, métier, tarif, statut.", icon: Megaphone, count: offres.count ?? 0, accessible: true },
    { id: "justificatifs", label: "Justificatifs KYC", description: "Type de document, statut de revue.", icon: FileText, count: justificatifs.count ?? 0, accessible: true },
    {
      id: "utilisateurs",
      label: "Utilisateurs",
      description: "Profil, email, téléphone — données personnelles, réservé aux administrateurs.",
      icon: Users,
      count: utilisateurs.count ?? 0,
      accessible: session.role === "admin",
    },
  ] as const;

  return (
    <div className="space-y-5">
      <div>
        <AdminH1>Export données</AdminH1>
        <p className="mt-1 text-[13px] text-[var(--a-text-2)]">
          Export CSV des principaux jeux de données de la plateforme, généré à la demande.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--a-border)] bg-[var(--a-surface)] p-5">
        <h2 className="mb-3 text-[13.5px] font-bold text-[var(--a-ink)]" style={{ fontFamily: "var(--a-font-display)" }}>Tables — CSV</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {jeux.map((jeu) => (
            <div key={jeu.id} className="flex flex-col rounded-[14px] border border-[var(--a-border)] p-4">
              <div className="flex items-center justify-between">
                <jeu.icon className="size-5 text-[var(--a-text-3)]" />
                <span className="a-tabular text-[12px] font-semibold text-[var(--a-text-2)]">{jeu.count.toLocaleString("fr-FR")} lignes</span>
              </div>
              <h3 className="mt-2.5 text-[13.5px] font-bold text-[var(--a-ink)]" style={{ fontFamily: "var(--a-font-display)" }}>{jeu.label}</h3>
              <p className="mt-1 flex-1 text-[12px] text-[var(--a-text-2)]">{jeu.description}</p>
              {jeu.accessible ? (
                <a
                  href={`/api/admin/export/${jeu.id}`}
                  className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-[9px] border border-[var(--a-border-strong)] px-3 py-2 text-[12px] font-semibold text-[var(--a-ink)] hover:bg-[var(--a-surface-2)]"
                  style={{ fontFamily: "var(--a-font-display)" }}
                >
                  <Download className="size-3.5" />
                  Exporter le CSV
                </a>
              ) : (
                <p className="mt-3 text-[11.5px] text-[var(--a-text-3)]">Réservé aux administrateurs.</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--a-border)] bg-[var(--a-surface)] p-5">
        <h2 className="mb-3 text-[13.5px] font-bold text-[var(--a-ink)]" style={{ fontFamily: "var(--a-font-display)" }}>Storage — archive</h2>
        <div className="flex items-center justify-between rounded-[14px] border border-dashed border-[var(--a-border-strong)] p-4">
          <div className="flex items-center gap-3">
            <Archive className="size-5 text-[var(--a-text-3)]" />
            <div>
              <p className="text-[13px] font-semibold text-[var(--a-ink)]">Buckets avatars / documents</p>
              <p className="text-[12px] text-[var(--a-text-2)]">
                Assemblage ZIP côté client à partir d&apos;URLs signées — pas encore construit sur cette instance.
              </p>
            </div>
          </div>
          <AdminBadge tone="grey">À venir</AdminBadge>
        </div>
      </div>
    </div>
  );
}
