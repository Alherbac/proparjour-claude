import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingPageHeader } from "@/components/marketing/page-header";
import { LANDING_BTN_BASE, LANDING_BTN_GHOST_LIGHT, LANDING_BTN_PRIMARY } from "@/components/marketing/button-styles";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Tarifs — ProParJour, une commission unique et affichée",
  description:
    "Inscription gratuite pour les prestataires et les recruteurs. ProParJour prélève une commission de 15% par mission réalisée — aucun frais caché, aucun abonnement.",
};

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 py-2 text-sm">
      <span className="mt-0.5 flex size-[18px] flex-none items-center justify-center rounded-[6px] bg-emerald">
        <Check className="size-2.5 text-white" strokeWidth={3} />
      </span>
      {children}
    </li>
  );
}

export default function TarifsPage() {
  return (
    <>
      <MarketingPageHeader
        eyebrow="Simple et transparent"
        titre="Une seule commission, affichée partout"
        description="Pas d'abonnement, pas de frais cachés : ProParJour se rémunère uniquement quand une mission est réalisée."
      />

      <section className="px-10 py-20 max-[900px]:px-6 max-[900px]:py-14">
        <div className="mx-auto grid max-w-[900px] grid-cols-2 gap-5 max-[900px]:grid-cols-1">
          <div className="rounded-[24px] border-[1.5px] border-line bg-white p-9">
            <span className="font-mono-landing text-xs font-medium uppercase tracking-[0.12em] text-muted-landing">
              Prestataires
            </span>
            <p className="mt-3 text-[40px] font-semibold text-ink">Gratuit</p>
            <p className="mb-6 text-sm text-muted-landing">Aucun frais d&apos;inscription ni d&apos;abonnement</p>
            <ul className="mb-7 divide-y divide-line">
              <CheckItem>Création de profil et vérification incluses</CheckItem>
              <CheckItem>Accès à toutes les missions correspondant à vos spécialités</CheckItem>
              <CheckItem>Vous fixez librement votre tarif journalier ou horaire</CheckItem>
              <CheckItem>Une commission de 15% est prélevée uniquement sur les missions réalisées</CheckItem>
            </ul>
            <Button render={<Link href="/inscription/prestataire" />} className={cn(LANDING_BTN_BASE, LANDING_BTN_GHOST_LIGHT, "w-full")}>
              Créer ma carte pro
            </Button>
          </div>

          <div className="rounded-[24px] border-[1.5px] border-ink bg-ink p-9 text-white">
            <span className="font-mono-landing text-xs font-medium uppercase tracking-[0.12em] text-white/50">
              Entreprises & particuliers
            </span>
            <p className="mt-3 text-[40px] font-semibold">Gratuit</p>
            <p className="mb-6 text-sm text-white/62">Vous ne payez que le montant des missions passées</p>
            <ul className="mb-7 divide-y divide-white/10">
              <CheckItem>Publication de missions et recherche de prestataires incluses</CheckItem>
              <CheckItem>Vous payez exactement le tarif affiché par le prestataire — pas de majoration</CheckItem>
              <CheckItem>Paiement sécurisé par carte, débloqué au prestataire une fois la mission validée</CheckItem>
              <CheckItem>Contrat et facture générés automatiquement à chaque mission</CheckItem>
            </ul>
            <Button render={<Link href="/prestataires" />} className={cn(LANDING_BTN_BASE, LANDING_BTN_PRIMARY, "w-full")}>
              Je recrute un prestataire
            </Button>
          </div>
        </div>

        <div className="mx-auto mt-14 max-w-[900px] rounded-2xl bg-paper-dim p-7">
          <h2 className="mb-3 text-lg font-semibold text-ink">Comment fonctionne la commission de 15% ?</h2>
          <p className="text-[14.5px] leading-[1.7] text-muted-landing">
            Le prestataire fixe librement son tarif journalier ou horaire — c&apos;est ce
            montant que voit et paie le recruteur, sans majoration. ProParJour prélève
            une commission de 15% sur ce montant au moment où la mission est validée ;
            le prestataire perçoit le solde. Le paiement du recruteur est débité par
            carte à la réservation et reste sécurisé jusqu&apos;à la confirmation de la
            mission par les deux parties.
          </p>
        </div>
      </section>
    </>
  );
}
