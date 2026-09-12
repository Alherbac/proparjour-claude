import type { Metadata } from "next";
import { MarketingPageHeader } from "@/components/marketing/page-header";
import {
  SECTIONS_CONFIDENTIALITE,
  DERNIERE_MISE_A_JOUR_CONFIDENTIALITE,
  CONFIDENTIALITE_A_COMPLETER,
} from "@/config/confidentialite";

export const metadata: Metadata = {
  title: "Politique de confidentialité — ProParJour",
  description:
    "Politique de confidentialité de la plateforme ProParJour : données collectées, finalités, durées de conservation et droits des utilisateurs.",
};

export default function ConfidentialitePage() {
  return (
    <>
      <MarketingPageHeader
        eyebrow={`Dernière mise à jour : ${DERNIERE_MISE_A_JOUR_CONFIDENTIALITE}`}
        titre="Politique de confidentialité"
      />

      <section className="px-10 py-20 max-[900px]:px-6 max-[900px]:py-14">
        <div className="mx-auto max-w-[760px] space-y-9">
          {CONFIDENTIALITE_A_COMPLETER && (
            <div
              className="rounded-lg border border-line bg-paper-dim px-4 py-3.5 text-[13.5px] leading-[1.7] text-muted-2"
              style={{ borderLeftWidth: "3px", borderLeftColor: "var(--color-acc)" }}
            >
              <p className="font-semibold text-ink">Document en préparation — validation juridique nécessaire</p>
              <p className="mt-1">
                Cette page décrit le fonctionnement réel de la plateforme d&apos;après son code.
                Elle n&apos;a pas été validée juridiquement et contient des espaces réservés
                signalés par <span className="font-medium text-ink">« À FOURNIR/VALIDER PAR LE RESPONSABLE LÉGAL »</span>
                {" "}(identité du responsable de traitement, DPO, plusieurs durées de conservation,
                mécanismes de transfert hors UE). Ces éléments doivent être complétés et l&apos;ensemble
                relu par un juriste avant toute ouverture publique.
              </p>
            </div>
          )}

          {SECTIONS_CONFIDENTIALITE.map((section) => (
            <div key={section.titre}>
              <h2 className="mb-2.5 text-[19px] font-semibold text-ink">{section.titre}</h2>
              <p className="whitespace-pre-line text-[15px] leading-[1.75] text-muted-landing">
                {section.texte}
              </p>
            </div>
          ))}

          <p className="border-t border-line pt-6 text-sm text-muted-2">
            Pour toute question relative à vos données personnelles, contactez-nous à{" "}
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
