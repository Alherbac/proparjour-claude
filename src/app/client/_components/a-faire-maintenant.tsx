"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, type BadgeTone } from "@/app/client/_components/badge";
import { DashButton } from "@/app/client/_components/button";
import { ancienneteFr } from "@/app/client/_lib";
import { lirePanierClient } from "@/app/client/_panier";

export type ItemAFaire = {
  cle: string;
  titre: string;
  badge: { label: string; tone: BadgeTone };
  explication: string;
  depuis: string; // ISO — l'ancienneté est calculée à l'affichage, jamais pré-formatée
  actionLabel: string;
  href: string;
};

/**
 * "À faire maintenant" — dossier design §4. Bordure #F8D3D1, pastille
 * rouge d'en-tête, une ligne par décision en attente.
 *
 * Le panier ("professionnels au panier non encore contactés") vit en
 * localStorage, jamais côté serveur (voir _panier.ts) : ce composant
 * reçoit les décisions réellement connues du serveur (devis,
 * candidatures) en props, puis ajoute la ligne panier après montage
 * si le panier n'est pas vide. Le décompte d'en-tête reflète donc
 * toujours la liste réellement affichée, jamais un chiffre à part
 * (§6.d) — au prix d'une ligne qui peut apparaître un instant après
 * les autres, le temps de l'hydratation.
 */
export function AFaireMaintenant({ items }: { items: ItemAFaire[] }) {
  const [itemPanier, setItemPanier] = useState<ItemAFaire | null>(null);

  useEffect(() => {
    const lignes = lirePanierClient();
    if (lignes.length === 0) return;
    // localStorage n'existe que côté navigateur : lire un système
    // externe au montage puis répercuter le résultat dans l'état est
    // exactement le cas d'usage documenté pour un effet (pas une
    // valeur dérivable pendant le rendu, donc pas de pattern
    // "ajuster l'état pendant le rendu" possible ici).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItemPanier({
      cle: "panier-non-contactes",
      titre: `${lignes.length} professionnel${lignes.length > 1 ? "s" : ""} au panier`,
      badge: { label: "Panier", tone: "gris" },
      explication: "Retenus mais aucune mission ne leur a encore été proposée.",
      depuis: new Date().toISOString(),
      actionLabel: "Voir le panier",
      href: "/client/panier",
    });
  }, []);

  const tousLesItems = itemPanier ? [...items, itemPanier] : items;

  if (tousLesItems.length === 0) {
    return (
      <div className="rounded-[18px] border border-[#EAE6E0] bg-white p-5">
        <p className="text-[13px] text-[#6B6660]">Rien d&apos;urgent pour l&apos;instant — tout est à jour.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[18px] border p-5" style={{ borderColor: "#F8D3D1" }}>
      <div className="mb-3.5 flex items-center gap-2">
        <span className="size-[7px] shrink-0 rounded-full" style={{ backgroundColor: "#E21D1B" }} />
        <h2 className="text-[15px] font-bold text-[#1A1917]">À faire maintenant</h2>
        <span className="text-[13px] text-[#6B6660]">
          {tousLesItems.length} action{tousLesItems.length > 1 ? "s" : ""} en attente
        </span>
      </div>
      <div className="divide-y divide-[#EFEBE6]">
        {tousLesItems.map((item) => (
          <div key={item.cle} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[14.5px] font-semibold text-[#1A1917]">{item.titre}</p>
                <Badge tone={item.badge.tone}>{item.badge.label}</Badge>
              </div>
              <p className="mt-0.5 text-[13px] text-[#6B6660]">{item.explication}</p>
            </div>
            <span className="min-w-[96px] shrink-0 text-[12px] text-[#98938B]">{ancienneteFr(item.depuis)}</span>
            <Link href={item.href} className="shrink-0">
              <DashButton variant="sombre">{item.actionLabel}</DashButton>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
