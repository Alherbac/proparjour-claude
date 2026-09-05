"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { StatCard } from "@/app/client/_components/stat-card";
import { DashButton } from "@/app/client/_components/button";
import { Vignette } from "@/app/client/_components/vignette";
import { LABEL_METIER } from "@/app/client/_types";
import { lirePanierClient, retirerDuPanierClient, EVENEMENT_PANIER, type LignePanierClient } from "@/app/client/_panier";
import type { MetierType } from "@/lib/supabase/database.types";

/**
 * "Votre panier" — dossier design §4. Le panier est une liste de
 * personnes, rien d'autre : aucun paiement, aucun total, aucun champ
 * de mission. Stocké en localStorage (aucune table "panier" dans le
 * schéma réel) : cet écran est nécessairement un composant client,
 * hydraté après montage.
 *
 * "Proposer la mission" mène vers le parcours réel existant
 * (/panier/proposer, hors périmètre /client — non modifié, seulement
 * lié) : la saisie date/horaires/lieu et la création de la mission à
 * partir d'un panier multi-personnes est une logique métier complexe
 * déjà réelle et testée ailleurs sur le site ; la dupliquer ici
 * aurait été le vrai risque, pas le simple lien.
 */
export function EcranPanier() {
  const [lignes, setLignes] = useState<LignePanierClient[]>([]);
  const [pret, setPret] = useState(false);

  useEffect(() => {
    function rafraichir() {
      setLignes(lirePanierClient());
      setPret(true);
    }
    rafraichir();
    window.addEventListener(EVENEMENT_PANIER, rafraichir);
    window.addEventListener("storage", rafraichir);
    return () => {
      window.removeEventListener(EVENEMENT_PANIER, rafraichir);
      window.removeEventListener("storage", rafraichir);
    };
  }, []);

  const parMetier = useMemo(() => {
    const carte = new Map<string, number>();
    for (const l of lignes) carte.set(l.metier, (carte.get(l.metier) ?? 0) + 1);
    return [...carte.entries()];
  }, [lignes]);

  function retirer(prestataireId: string) {
    retirerDuPanierClient(prestataireId);
    setLignes(lirePanierClient());
  }

  if (!pret) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] text-[#1A1917] sm:text-[30px]" style={{ fontFamily: "var(--font-instrument-serif)" }}>
            Votre panier
          </h1>
          <p className="mt-1 text-[13.5px] text-[#6B6660]">Les professionnels que vous avez retenus, avant de proposer la mission.</p>
        </div>
        {lignes.length > 0 && (
          <Link href="/panier/proposer">
            <DashButton variant="plein">Proposer la mission</DashButton>
          </Link>
        )}
      </div>

      {lignes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[18px] border border-dashed border-[#DDD8D1] py-16 text-center">
          <ShoppingCart className="size-7" style={{ color: "#98938B" }} />
          <p className="text-[13.5px] text-[#6B6660]">Votre panier est vide pour l&apos;instant.</p>
          <Link href="/prestataires">
            <DashButton variant="secondaire">Rechercher un professionnel</DashButton>
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(216px, 100%), 1fr))" }}>
            <StatCard label="Professionnels" valeur={lignes.length} />
            {parMetier.map(([metier, n]) => (
              <StatCard key={metier} label={LABEL_METIER[metier as MetierType] ?? metier} valeur={n} />
            ))}
          </div>

          <div className="space-y-2.5">
            {lignes.map((l) => (
              <div key={l.prestataireId} className="flex flex-wrap items-center gap-3 rounded-[14px] border border-[#EAE6E0] bg-white p-4">
                <Vignette photoUrl={l.photoUrl} nom={l.prenom} />
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-semibold text-[#1A1917]">{l.prenom}</p>
                  <p className="text-[12.5px] font-semibold" style={{ color: "#E21D1B" }}>
                    {LABEL_METIER[l.metier as MetierType] ?? l.metier}
                  </p>
                  {l.certifications && l.certifications.length > 0 && (
                    <p className="mt-0.5 text-[12px] text-[#6B6660]">{l.certifications.join(" · ")}</p>
                  )}
                  <p className="mt-0.5 text-[12.5px] text-[#6B6660]">
                    {l.tarifMontant} € / {l.tarifType === "horaire" ? "heure" : "jour"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link href={`/prestataires/${l.prestataireId}`}>
                    <DashButton variant="secondaire">Revoir le profil</DashButton>
                  </Link>
                  <DashButton variant="secondaire" onClick={() => retirer(l.prestataireId)}>
                    Retirer
                  </DashButton>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[12.5px] text-[#6B6660]">
            Aucun paiement à ce stade. Le montant n&apos;est bloqué qu&apos;une fois la mission acceptée par le professionnel.
          </p>
        </>
      )}
    </div>
  );
}
