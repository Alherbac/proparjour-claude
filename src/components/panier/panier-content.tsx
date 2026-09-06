"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { METIERS, type MetierId } from "@/config/metiers";
import { usePanier } from "@/hooks/use-panier";
import { retirerLigne } from "@/lib/panier";

/**
 * Écran "Panier" — reconstruit à partir du dossier design ("Proparjour
 * design a jour", ProParJour App.dc.html, `isPanier`), copié à
 * l'identique (structure, dimensions, couleurs). Logique métier
 * inchangée depuis "proparjour 6-7" §8 (RÉVISÉ, voir lib/panier.ts) :
 * simple liste de personnes retenues, aucun détail de mission, aucun
 * paiement ici.
 *
 * Écart volontaire avec le chantier précédent : le lien "Retour à
 * l'accueil" a été retiré — il n'existe nulle part dans la référence
 * (ni sur l'état vide, ni sur l'état rempli).
 */
export function PanierContent() {
  const panier = usePanier();
  const estVide = panier.lignes.length === 0;

  const parMetier = new Map<MetierId, number>();
  for (const ligne of panier.lignes) {
    parMetier.set(ligne.metier, (parMetier.get(ligne.metier) ?? 0) + 1);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 lg:px-8 lg:py-14">
      <h1
        className="mb-1.5 text-ppj-ink"
        style={{ fontFamily: "var(--font-display-serif)", fontSize: "40px", lineHeight: 1.04, letterSpacing: "-0.02em" }}
      >
        Votre panier
      </h1>
      <p className="max-w-[62ch] text-[15px] text-ppj-text-3">
        Les professionnels que vous avez retenus. Rien ne leur est encore envoyé : vous décrivez la mission à l&apos;étape
        suivante, puis chacun accepte ou décline.
      </p>

      {estVide ? (
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
              render={<Link href="/publier-une-offre" />}
              variant="outline"
              className="min-h-12 rounded-[13px] border-ppj-line-button px-[22px] text-[15px] font-semibold text-ppj-ink hover:border-ppj-ink"
            >
              Publier mon besoin
            </Button>
          </div>
        </div>
      ) : (
        <div
          className="mt-7 grid items-start gap-[22px]"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(340px, 100%), 1fr))" }}
        >
          <div className="grid gap-3">
            {panier.lignes.map((ligne, index) => {
              const metier = METIERS.find((m) => m.id === ligne.metier);
              const certifications = ligne.certifications ?? [];
              return (
                <div key={`${ligne.prestataireId}-${index}`} className="rounded-2xl border border-ppj-line bg-white p-[18px]">
                  <div className="flex flex-wrap items-center gap-3.5">
                    {ligne.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- pas d'autre usage de next/image dans ce projet
                      <img src={ligne.photoUrl} alt={ligne.prenom} className="size-12 shrink-0 rounded-xl object-cover" />
                    ) : (
                      <div
                        className="size-12 shrink-0 rounded-xl"
                        style={{ backgroundImage: "repeating-linear-gradient(135deg, #F0ECE6 0 6px, #E4DFD7 6px 12px)" }}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[16px] font-semibold text-ppj-ink">{ligne.prenom}</p>
                      <p className="mt-0.5 text-[13.5px] text-ppj-text-3">
                        {metier?.filiere}
                        {certifications.length > 0 && ` · ${certifications.slice(0, 2).join(" · ")}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => retirerLigne(index)}
                      className="shrink-0 text-[13px] text-ppj-text-4 underline decoration-solid underline-offset-[3px] transition-colors hover:text-primary"
                    >
                      Retirer
                    </button>
                  </div>

                  <div className="mt-3.5 flex flex-wrap items-center gap-3 border-t border-ppj-line-2 pt-3.5">
                    <span className="text-[14px] font-semibold text-ppj-ink">
                      {ligne.tarifType === "horaire" ? `${ligne.tarifMontant} € / heure` : `${ligne.tarifMontant} € / jour`}
                    </span>
                    {certifications.length > 0 && (
                      <span className="text-[13px] text-[#6B6660]">{certifications.join(" · ")}</span>
                    )}
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
                  <span className="min-w-0 text-[#6B6660]">{m.filiere}</span>
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
            <p className="mt-3.5 text-[12.5px] leading-[1.6] text-[#6B6660]">
              Aucun paiement à ce stade. Le montant n&apos;est bloqué qu&apos;une fois la mission acceptée par le
              professionnel.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
