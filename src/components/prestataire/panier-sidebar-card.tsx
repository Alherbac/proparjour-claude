"use client";

import Link from "next/link";
import { METIERS } from "@/config/metiers";
import { usePanier } from "@/hooks/use-panier";

/**
 * Mini-résumé du panier — dossier design, "Résultats de recherche"
 * (colonne latérale, `isResultats`). La référence affiche
 * "{{c.date}} · {{c.hours}}" sous chaque nom, mais ces informations
 * n'existent pas encore à ce stade du parcours (§8 RÉVISÉ : aucun
 * champ de mission sur une ligne de panier, saisi uniquement à
 * "Proposer la mission"). Remplacé ici par le métier, seule
 * information réellement disponible — voir point d'étape.
 */
export function PanierSidebarCard() {
  const panier = usePanier();

  return (
    <div className="rounded-[18px] border border-ppj-line bg-white p-5" style={{ position: "sticky", top: 24 }}>
      <h2 className="mb-1 text-[17px] font-semibold text-ppj-ink">Panier</h2>
      <p className="mb-3.5 text-[12.5px] text-ppj-text-4">
        {panier.lignes.length} professionnel{panier.lignes.length !== 1 ? "s" : ""} retenu{panier.lignes.length !== 1 ? "s" : ""}
      </p>
      {panier.lignes.length > 0 && (
        <div className="mb-4 grid gap-2.5">
          {panier.lignes.map((ligne, i) => {
            const metier = METIERS.find((m) => m.id === ligne.metier);
            return (
              <div key={`${ligne.prestataireId}-${i}`} className="flex items-baseline gap-2.5 text-[13.5px]">
                <span className="mt-[-3px] block size-[5px] shrink-0 rounded-full bg-primary" />
                <span className="min-w-0">
                  <span className="block font-semibold text-ppj-ink">{ligne.prenom}</span>
                  <span className="mt-0.5 block text-xs text-ppj-text-4">{metier?.filiere}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
      <Link
        href="/panier"
        className="flex min-h-12 w-full items-center justify-center rounded-xl bg-ppj-ink text-[14.5px] font-semibold text-[#FBFAF8] transition-colors hover:bg-primary"
      >
        Voir le panier
      </Link>
    </div>
  );
}
