import type { Metadata } from "next";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { MarketingPageHeader } from "@/components/marketing/page-header";

export const metadata: Metadata = {
  title: "Contact — ProParJour",
  description:
    "Une question sur votre mission, votre profil ou un paiement ? Contactez l'équipe ProParJour par e-mail ou par téléphone.",
};

const COORDONNEES = [
  { icon: Mail, label: "E-mail", value: "contact@proparjour.fr", href: "mailto:contact@proparjour.fr" },
  { icon: Phone, label: "Téléphone", value: "01 23 45 67 89", href: "tel:+33123456789" },
  { icon: MapPin, label: "Adresse", value: "123 Avenue des Champs-Élysées, 75008 Paris", href: null },
  { icon: Clock, label: "Horaires", value: "Du lundi au vendredi, 9h – 18h", href: null },
] as const;

export default function ContactPage() {
  return (
    <>
      <MarketingPageHeader
        eyebrow="On vous répond"
        titre="Une question ? Écrivez-nous"
        description="Compte, mission en cours, paiement, partenariat — l'équipe ProParJour vous répond sous 48h ouvrées."
      />

      <section className="px-10 py-20 max-[900px]:px-6 max-[900px]:py-14">
        <div className="mx-auto grid max-w-[800px] gap-4 sm:grid-cols-2">
          {COORDONNEES.map((item) => {
            const content = (
              <div className="flex items-start gap-3.5 rounded-2xl border border-line bg-white p-5">
                <span className="flex size-[42px] flex-none items-center justify-center rounded-[11px] bg-emerald/10 text-emerald">
                  <item.icon className="size-5" />
                </span>
                <div>
                  <b className="block text-[13px] font-medium text-muted-2">{item.label}</b>
                  <span className="mt-0.5 block text-[15px] font-semibold text-ink">{item.value}</span>
                </div>
              </div>
            );
            return item.href ? (
              <a key={item.label} href={item.href} className="transition-opacity hover:opacity-80">
                {content}
              </a>
            ) : (
              <div key={item.label}>{content}</div>
            );
          })}
        </div>

        <p className="mx-auto mt-10 max-w-[800px] text-sm leading-[1.65] text-muted-landing">
          Vous êtes déjà inscrit·e ? Pour toute question liée à une mission en cours,
          passez par la messagerie de votre{" "}
          <a href="/tableau-de-bord" className="font-medium text-sec underline underline-offset-2">
            tableau de bord
          </a>{" "}
          — c&apos;est le canal le plus rapide.
        </p>
      </section>
    </>
  );
}
