import type { Metadata } from "next";
import { MarketingPageHeader } from "@/components/marketing/page-header";
import {
  SECTIONS_MENTIONS_LEGALES,
  DERNIERE_MISE_A_JOUR_MENTIONS,
  MENTIONS_LEGALES_A_COMPLETER,
} from "@/config/mentions-legales";

export const metadata: Metadata = {
  title: "Mentions légales — ProParJour",
  description: "Mentions légales de la plateforme ProParJour.",
};

export default function MentionsLegalesPage() {
  return (
    <>
      <MarketingPageHeader
        eyebrow={`Dernière mise à jour : ${DERNIERE_MISE_A_JOUR_MENTIONS}`}
        titre="Mentions légales"
      />

      <section className="px-10 py-20 max-[900px]:px-6 max-[900px]:py-14">
        <div className="mx-auto max-w-[760px] space-y-9">
          {MENTIONS_LEGALES_A_COMPLETER && (
            <div
              className="rounded-lg border border-line bg-paper-dim px-4 py-3.5 text-[13.5px] leading-[1.7] text-muted-2"
              style={{ borderLeftWidth: "3px", borderLeftColor: "var(--color-acc)" }}
            >
              <p className="font-semibold text-ink">Document en préparation — validation juridique nécessaire</p>
              <p className="mt-1">
                Les informations d&apos;identification de l&apos;éditeur (dénomination sociale, forme
                juridique, SIRET, RCS, adresse, directeur de la publication, coordonnées de
                l&apos;hébergeur) ne sont pas toutes présentes dans le projet. Les espaces réservés
                sont signalés par <span className="font-medium text-ink">« À FOURNIR/VALIDER PAR LE RESPONSABLE LÉGAL »</span>
                {" "}et doivent être renseignés avant toute ouverture publique.
              </p>
            </div>
          )}

          {SECTIONS_MENTIONS_LEGALES.map((section) => (
            <div key={section.titre}>
              <h2 className="mb-2.5 text-[19px] font-semibold text-ink">{section.titre}</h2>
              <p className="whitespace-pre-line text-[15px] leading-[1.75] text-muted-landing">
                {section.texte}
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
