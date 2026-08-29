import type { Metadata } from "next";
import { MarketingPageHeader } from "@/components/marketing/page-header";
import { ARTICLES_CGU, DERNIERE_MISE_A_JOUR_CGU } from "@/config/cgu";

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation — ProParJour",
  description: "Conditions générales d'utilisation de la plateforme ProParJour.",
};

export default function CguPage() {
  return (
    <>
      <MarketingPageHeader
        eyebrow={`Dernière mise à jour : ${DERNIERE_MISE_A_JOUR_CGU}`}
        titre="Conditions générales d'utilisation"
      />

      <section className="px-10 py-20 max-[900px]:px-6 max-[900px]:py-14">
        <div className="mx-auto max-w-[760px] space-y-9">
          {ARTICLES_CGU.map((article) => (
            <div key={article.titre}>
              <h2 className="mb-2.5 text-[19px] font-semibold text-ink">{article.titre}</h2>
              <p className="text-[15px] leading-[1.75] text-muted-landing">{article.texte}</p>
            </div>
          ))}

          <p className="border-t border-line pt-6 text-sm text-muted-2">
            ProParJour est édité par Alherbac. Pour toute question relative aux présentes
            CGU, contactez-nous à{" "}
            <a href="mailto:contact@proparjour.fr" className="text-sec underline underline-offset-2">
              contact@proparjour.fr
            </a>
            .
          </p>
        </div>
      </section>
    </>
  );
}
