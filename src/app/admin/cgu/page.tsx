import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, ScrollText } from "lucide-react";
import { requireAdminSession } from "@/lib/admin/auth";
import { ARTICLES_CGU, DERNIERE_MISE_A_JOUR_CGU } from "@/config/cgu";

export const metadata: Metadata = { title: "CGU — Admin ProParJour" };

export default async function AdminCguPage() {
  await requireAdminSession();

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display-serif text-2xl text-foreground">CGU</h1>
          <p className="mt-1 text-sm text-muted-foreground">Dernière mise à jour : {DERNIERE_MISE_A_JOUR_CGU}</p>
        </div>
        <Link
          href="/cgu"
          target="_blank"
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40"
        >
          <ExternalLink className="size-3.5" />
          Voir la page publique
        </Link>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
        <ScrollText className="mt-0.5 size-4 shrink-0" />
        <p>
          Ce contenu est volontairement géré dans le code source (versionné, déployé après revue) plutôt que via un
          éditeur en base — un texte qui engage juridiquement la plateforme ne doit pas pouvoir être modifié en un
          clic sans passer par une revue. Cet écran est une vue de contrôle, pas un éditeur : pour modifier les CGU,
          passez par un commit sur <code className="rounded bg-black/5 px-1 py-0.5 dark:bg-white/10">src/config/cgu.ts</code>.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-background p-5">
        <div className="mx-auto max-w-[760px] space-y-7">
          {ARTICLES_CGU.map((article) => (
            <div key={article.titre}>
              <h2 className="mb-2 text-base font-semibold text-foreground">{article.titre}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{article.texte}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
