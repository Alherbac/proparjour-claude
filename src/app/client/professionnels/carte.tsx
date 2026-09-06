"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { FavoriButton } from "@/components/prestataire/favori-button";
import { CertBadge } from "@/app/client/_components/cert-badge";
import { Vignette } from "@/app/client/_components/vignette";
import { LABEL_METIER } from "@/app/client/_types";
import type { ProfessionnelHistorique } from "@/lib/professionnels-habituels";
import type { MetierType } from "@/lib/supabase/database.types";

function dateLongueFr(dateIso: string): string {
  return new Date(`${dateIso}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

/** Même donnée réelle que l'ancien ProfessionnelHabituelCard (getProfessionnelsHistorique), interface refaite. */
export function CarteProfessionnel({ professionnel }: { professionnel: ProfessionnelHistorique }) {
  const nom = [professionnel.prenom, professionnel.nom?.charAt(0)].filter(Boolean).join(" ") || "Prestataire";

  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-[#EAE6E0] bg-white p-4">
      <Vignette photoUrl={professionnel.photoUrl} nom={nom} />
      <Link href={`/prestataires/${professionnel.prestataireId}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-[14.5px] font-semibold text-[#1A1917]">{nom}</p>
          {professionnel.statutVerification === "valide" && <CertBadge />}
        </div>
        <p className="truncate text-[12.5px] font-semibold" style={{ color: "#E21D1B" }}>
          {professionnel.metier ? LABEL_METIER[professionnel.metier as MetierType] : "—"}
        </p>
        <p className="mt-0.5 flex items-center gap-x-3 text-[12px] text-[#6B6660]">
          <span>{professionnel.nbMissions} mission{professionnel.nbMissions > 1 ? "s" : ""} ensemble</span>
          {professionnel.ville && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3" />
              {professionnel.ville}
            </span>
          )}
        </p>
        <p className="mt-0.5 text-[11.5px] text-[#98938B]">Dernière mission le {dateLongueFr(professionnel.derniereMission)}</p>
      </Link>
      <FavoriButton prestataireId={professionnel.prestataireId} className="static shrink-0 bg-transparent shadow-none" />
    </div>
  );
}
