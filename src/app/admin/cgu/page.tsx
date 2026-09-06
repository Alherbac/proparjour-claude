import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, ScrollText } from "lucide-react";
import { requireAdminSession } from "@/lib/admin/auth";
import { ARTICLES_CGU, DERNIERE_MISE_A_JOUR_CGU } from "@/config/cgu";
import { AdminH1 } from "@/components/admin/ui/section";
import { AdminKpiCard } from "@/components/admin/ui/kpi-card";
import { AdminButton } from "@/components/admin/ui/button";

export const metadata: Metadata = { title: "CGU — Admin ProParJour" };

export default async function AdminCguPage() {
  await requireAdminSession();

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <AdminH1>CGU</AdminH1>
          <p className="mt-1 text-[13px] text-[var(--a-text-2)]">
            Acceptations par utilisateur et par version — le versionnage est segmenté par rôle, avec un délai de
            grâce de 2 minutes après inscription.
          </p>
        </div>
        <Link href="/cgu" target="_blank">
          <AdminButton variant="secondary">
            <ExternalLink className="size-3.5" />
            Voir la page publique
          </AdminButton>
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <AdminKpiCard label="Version de référence" valeur={DERNIERE_MISE_A_JOUR_CGU} />
        <AdminKpiCard label="Acceptations à jour" valeur="non suivi" aide="aucune table d'acceptation en base" />
        <AdminKpiCard label="À relancer" valeur="non suivi" aide="version antérieure" />
      </div>

      <div className="flex items-start gap-3 rounded-2xl p-4 text-[13px]" style={{ background: "var(--a-badge-orange-bg)", border: "1px solid var(--a-badge-orange-border)", color: "var(--a-badge-orange-text)" }}>
        <ScrollText className="mt-0.5 size-4 shrink-0" />
        <p>
          Le contenu est géré dans le code source (versionné, déployé après revue) plutôt que via un éditeur en
          base — un texte qui engage juridiquement la plateforme ne doit pas être modifiable en un clic. Aucune
          table ne trace aujourd&apos;hui l&apos;acceptation individuelle par utilisateur/version/rôle : construire
          le tableau « Utilisateur · Rôle · Version · Acceptée le · Statut » demandé par la maquette suppose
          d&apos;instrumenter l&apos;inscription et la connexion (hors de <code>/admin</code>) — à confirmer avant
          de l&apos;ajouter. Voir rapport final.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--a-border)] bg-[var(--a-surface)] p-5">
        <div className="mx-auto max-w-[760px] space-y-7">
          {ARTICLES_CGU.map((article) => (
            <div key={article.titre}>
              <h2 className="mb-2 text-[14px] font-bold text-[var(--a-ink)]" style={{ fontFamily: "var(--a-font-display)" }}>{article.titre}</h2>
              <p className="text-[13px] leading-relaxed text-[var(--a-text-2)]">{article.texte}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
