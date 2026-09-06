"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { usePanier } from "@/hooks/use-panier";
import { ajouterLigne, retirerParPrestataire } from "@/lib/panier";
import type { MetierId } from "@/config/metiers";
import type { TarifType } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

/**
 * Bandeau de la fiche professionnelle publique — refonte "3 Istanbul
 * design 2", §6, simplifiée par "proparjour 6-7" §8 (RÉVISÉ) : le
 * panier n'accueille plus de détail de mission (date/horaires/lieu),
 * donc plus de formulaire "Réserver une date précise" à déplier ici —
 * "Ajouter au panier" (bascule dateless) reste la seule action, en un
 * clic. "Contacter" (fonctionnalité existante) reste un second bouton,
 * contour.
 */
export function FicheBandeau({
  prestataire,
  metierLabel,
  filiere,
  cnapsVerifie,
  identiteVerifiee,
  premierJourDispo,
  enMission = false,
}: {
  prestataire: {
    id: string;
    prenom: string | null;
    photoUrl: string | null;
    ville: string;
    tarifMontant: number;
    tarifType: TarifType;
    metier: MetierId;
    certifications: string[];
  };
  metierLabel: string;
  filiere: string;
  cnapsVerifie: boolean;
  identiteVerifiee: boolean;
  premierJourDispo: string | null;
  enMission?: boolean;
}) {
  const panier = usePanier();
  const auPanier = panier.lignes.some((l) => l.prestataireId === prestataire.id);

  function basculerPanier() {
    if (auPanier) {
      retirerParPrestataire(prestataire.id);
      return;
    }
    ajouterLigne({
      prestataireId: prestataire.id,
      prenom: prestataire.prenom ?? "Prestataire",
      metier: prestataire.metier,
      tarifMontant: prestataire.tarifMontant,
      tarifType: prestataire.tarifType,
      photoUrl: prestataire.photoUrl,
      certifications: prestataire.certifications,
    });
  }

  return (
    <div className="border-b border-ppj-line bg-white px-6 pb-[26px] pt-[22px] sm:px-9">
      <div className="mx-auto max-w-[1120px]">
        <Link href="/prestataires?mode=recherche" className="text-[13.5px] text-ppj-text-3 hover:text-ppj-ink">
          ← Résultats
        </Link>

        <div className="mt-4 flex flex-wrap items-start gap-5">
          {prestataire.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- pas d'autre usage de next/image dans ce projet
            <img
              src={prestataire.photoUrl}
              alt={metierLabel}
              className="size-24 flex-none rounded-[24px] object-cover"
            />
          ) : (
            <div
              className="size-24 flex-none rounded-[24px]"
              style={{ backgroundImage: "repeating-linear-gradient(135deg, #F0ECE6 0 7px, #E4DFD7 7px 14px)" }}
            />
          )}

          <div className="min-w-0 flex-1 basis-[280px]">
            {prestataire.prenom && (
              <p className="mb-1 text-[12.5px] text-ppj-text-4">{prestataire.prenom}</p>
            )}
            <h1
              className="text-ppj-ink"
              style={{ fontFamily: "var(--font-display-serif)", fontSize: "34px", lineHeight: 1.06, letterSpacing: "-0.02em" }}
            >
              {metierLabel}
            </h1>
            <p className="mt-1.5 text-[14.5px] text-ppj-text-3">
              {filiere} · {prestataire.ville}
            </p>
            {(cnapsVerifie || identiteVerifiee || premierJourDispo || enMission) && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {cnapsVerifie && <Badge variant="default">Carte CNAPS vérifiée</Badge>}
                {identiteVerifiee && <Badge variant="secondary">Identité vérifiée</Badge>}
                {premierJourDispo && !enMission && <Badge variant="secondary">Disponible {premierJourDispo}</Badge>}
                {enMission && (
                  <span className="inline-flex h-5 items-center rounded-full border border-amber-200 bg-amber-50 px-2 text-xs font-medium text-amber-700">
                    En mission
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="grid flex-none gap-2.5">
            <button
              type="button"
              onClick={basculerPanier}
              className={cn(
                "min-h-12 rounded-[13px] px-[22px] text-[15px] font-semibold transition-colors",
                auPanier
                  ? "border border-ppj-line-button bg-white text-ppj-ink hover:border-ppj-ink"
                  : "bg-primary text-white hover:bg-[#B8130F]",
              )}
            >
              {auPanier ? "Retirer du panier" : "Ajouter au panier"}
            </button>
            <Link
              href="/client/messagerie"
              className="flex min-h-12 items-center justify-center rounded-[13px] border border-ppj-line-button bg-white px-[22px] text-[15px] font-semibold text-ppj-ink hover:border-ppj-ink"
            >
              Contacter
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
