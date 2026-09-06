"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useFavoris } from "@/hooks/use-favoris";
import { createClient } from "@/lib/supabase/client";
import { FavoriButton } from "@/components/prestataire/favori-button";
import { Vignette } from "@/app/client/_components/vignette";
import { LABEL_METIER } from "@/app/client/_types";
import type { PrestatairesPublicsRow, MetierType } from "@/lib/supabase/database.types";

/** Même source réelle que l'ancien FavorisSection (useFavoris, localStorage + table prestataires_publics), interface refaite. */
export function Favoris() {
  const favoris = useFavoris();
  const [profils, setProfils] = useState<PrestatairesPublicsRow[]>([]);
  const [charge, setCharge] = useState(false);

  useEffect(() => {
    if (favoris.ids.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resynchronise l'affichage suite à un changement des favoris (store externe, localStorage), pas une boucle de rendus
      setProfils([]);
      setCharge(true);
      return;
    }
    const supabase = createClient();
    supabase
      .from("prestataires_publics")
      .select("*")
      .in("id", favoris.ids)
      .then(({ data }) => {
        setProfils(data ?? []);
        setCharge(true);
      });
  }, [favoris.ids]);

  if (!charge) return null;

  if (profils.length === 0) {
    return <p className="rounded-[14px] border border-dashed border-[#DDD8D1] p-4 text-[13px] text-[#6B6660]">Aucun favori pour l&apos;instant. Ajoutez-en depuis un profil ou une recommandation.</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {profils.map((profil) => (
        <div key={profil.id} className="flex items-center gap-3 rounded-[14px] border border-[#EAE6E0] bg-white p-4">
          <Vignette photoUrl={profil.photo_url} nom={profil.prenom ?? "?"} />
          <Link href={`/prestataires/${profil.id}`} className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold text-[#1A1917]">{profil.prenom}</p>
            <p className="truncate text-[12.5px] font-semibold" style={{ color: "#E21D1B" }}>{LABEL_METIER[profil.metier as MetierType]}</p>
          </Link>
          <FavoriButton prestataireId={profil.id} className="static bg-transparent shadow-none" />
        </div>
      ))}
    </div>
  );
}
