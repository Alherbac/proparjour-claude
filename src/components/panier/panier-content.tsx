"use client";

import Link from "next/link";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { METIERS, type MetierId } from "@/config/metiers";
import { usePanier } from "@/hooks/use-panier";
import { retirerLigne } from "@/lib/panier";

/**
 * "proparjour 6-7" §8 (RÉVISÉ) — le panier redevient une simple liste
 * de personnes retenues : aucun détail de mission (date/horaires/lieu
 * ont disparu de la ligne, voir lib/panier.ts), aucun total, et
 * surtout aucun paiement ici — le bouton "Payer et créer les
 * missions" de l'ancienne version était explicitement désigné par le
 * README comme une erreur ("il court-circuite l'accord du
 * professionnel"). Un seul bouton : "Proposer la mission", qui mène à
 * /panier/proposer où le détail (commun + par métier) se saisit une
 * fois pour toutes avant l'envoi.
 */
export function PanierContent() {
  const panier = usePanier();

  if (panier.lignes.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-14 lg:px-8">
        <p
          className="mb-1.5 text-ppj-ink"
          style={{ fontFamily: "var(--font-display-serif)", fontSize: "40px", lineHeight: 1.04, letterSpacing: "-0.02em" }}
        >
          Votre panier
        </p>
        <div className="mt-6 rounded-[20px] border border-ppj-line bg-white px-7 py-14 text-center">
          <span
            className="inline-grid size-12 place-items-center rounded-[14px] border border-ppj-line bg-ppj-field text-[22px] text-ppj-text-5"
            style={{ fontFamily: "var(--font-display-serif)" }}
          >
            —
          </span>
          <p
            className="mx-auto mt-4 mb-2 text-ppj-ink"
            style={{ fontFamily: "var(--font-display-serif)", fontSize: "26px", letterSpacing: "-0.01em" }}
          >
            Votre panier est vide
          </p>
          <p className="mx-auto mb-5 max-w-[34em] text-[14.5px] leading-[1.6] text-ppj-text-3">
            Ajoutez des professionnels depuis les résultats de recherche, ou décrivez votre besoin en une phrase.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              render={<Link href="/prestataires?mode=recherche" />}
              className="min-h-12 rounded-[13px] bg-primary px-[22px] text-[15px] font-semibold text-white hover:bg-[#B8130F]"
            >
              Rechercher un professionnel
            </Button>
            <Button
              render={<Link href="/prestataires?mode=publier" />}
              variant="outline"
              className="min-h-12 rounded-[13px] border-ppj-line-button px-[22px] text-[15px] font-semibold text-ppj-ink hover:border-ppj-ink"
            >
              Publier mon besoin
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const parMetier = new Map<MetierId, number>();
  for (const ligne of panier.lignes) {
    parMetier.set(ligne.metier, (parMetier.get(ligne.metier) ?? 0) + 1);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 lg:px-8 lg:py-14">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-ppj-text-3 transition-colors hover:text-ppj-ink"
      >
        <Home className="size-3.5" />
        Retour à l&apos;accueil
      </Link>

      <p
        className="mt-4 mb-1.5 text-ppj-ink"
        style={{ fontFamily: "var(--font-display-serif)", fontSize: "40px", lineHeight: 1.04, letterSpacing: "-0.02em" }}
      >
        Votre panier
      </p>
      <p className="max-w-[62ch] text-[15px] text-ppj-text-3">
        Les professionnels que vous avez retenus. Rien ne leur est encore envoyé : vous décrivez la mission à l&apos;étape
        suivante, puis chacun accepte ou décline.
      </p>

      <div
        className="mt-7 grid items-start gap-[22px]"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(340px, 100%), 1fr))" }}
      >
        <div className="grid gap-3">
          {panier.lignes.map((ligne, index) => {
            const metier = METIERS.find((m) => m.id === ligne.metier);
            return (
              <div key={`${ligne.prestataireId}-${index}`} className="rounded-2xl border border-ppj-line bg-white p-[18px]">
                <div className="flex flex-wrap items-center gap-3.5">
                  {ligne.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- pas d'autre usage de next/image dans ce projet
                    <img src={ligne.photoUrl} alt={ligne.prenom} className="size-[46px] shrink-0 rounded-[13px] object-cover" />
                  ) : (
                    <div
                      className="size-[46px] shrink-0 rounded-[13px]"
                      style={{ backgroundImage: "repeating-linear-gradient(135deg, #F0ECE6 0 6px, #E4DFD7 6px 12px)" }}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[15.5px] font-semibold text-ppj-ink">{ligne.prenom}</p>
                    <p className="mt-0.5 text-[12.5px] text-ppj-text-3">{metier?.filiere}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => retirerLigne(index)}
                    className="shrink-0 text-[13px] text-ppj-text-4 underline decoration-solid underline-offset-[3px] transition-colors hover:text-primary"
                  >
                    Retirer
                  </button>
                </div>

                <div className="mt-3.5 flex items-center gap-3 border-t border-ppj-line-2 pt-3.5">
                  <span className="text-[13px] text-ppj-text-2">
                    {ligne.tarifType === "horaire" ? `${ligne.tarifMontant} € / heure` : `${ligne.tarifMontant} € / jour`}
                  </span>
                  <Link
                    href={`/prestataires/${ligne.prestataireId}`}
                    className="ml-auto shrink-0 rounded-[10px] border border-ppj-line-button px-3.5 py-[9px] text-[13px] font-semibold text-ppj-ink transition-colors hover:border-ppj-ink"
                  >
                    Revoir le profil
                  </Link>
                </div>
              </div>
            );
          })}
          <Link
            href="/prestataires?mode=recherche"
            className="rounded-2xl border border-dashed border-ppj-line-button px-[18px] py-[18px] text-center text-[14.5px] font-semibold text-ppj-text-3 transition-colors hover:border-ppj-ink hover:text-ppj-ink"
          >
            + Ajouter un professionnel
          </Link>
        </div>

        <div className="sticky top-6 rounded-[18px] border border-ppj-line bg-white p-[22px]">
          <h2 className="text-[17px] font-semibold text-ppj-ink">Votre sélection</h2>
          <div className="mt-4 grid gap-[11px] text-[14.5px]">
            {METIERS.filter((m) => parMetier.has(m.id)).map((m) => (
              <span key={m.id} className="flex items-center justify-between gap-3.5">
                <span className="min-w-0 text-ppj-text-2">{m.filiere}</span>
                <span className="shrink-0 text-ppj-ink">{parMetier.get(m.id)}</span>
              </span>
            ))}
            <span className="my-1 block h-px bg-ppj-line-2" />
            <span className="flex items-center justify-between gap-3.5 font-semibold text-ppj-ink">
              <span>Professionnels retenus</span>
              <span>{panier.lignes.length}</span>
            </span>
          </div>
          <Button
            render={<Link href="/panier/proposer" />}
            className="mt-[18px] min-h-[52px] w-full rounded-[13px] bg-primary text-[15.5px] font-semibold text-white hover:bg-[#B8130F]"
          >
            Proposer la mission
          </Button>
          <p className="mt-3.5 text-[12.5px] leading-[1.6] text-ppj-text-4">
            Aucun paiement à ce stade. Le montant n&apos;est bloqué qu&apos;une fois la mission acceptée par le professionnel.
          </p>
        </div>
      </div>
    </div>
  );
}
