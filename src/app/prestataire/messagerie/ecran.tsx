"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { FilterPill } from "@/app/prestataire/_components/filter-pill";
import { Badge } from "@/app/prestataire/_components/badge";
import { DashButton } from "@/app/prestataire/_components/button";
import { ancienneteFr } from "@/app/prestataire/_lib";
import { BADGE_STATUT_MISSION_PRESTATAIRE, type ConversationPrestataire } from "@/app/prestataire/_types";

const TONE_MISSION: Record<string, "vert" | "orange" | "rouge" | "bleu" | "gris"> = {
  "À venir": "gris",
  Confirmée: "bleu",
  "En cours": "vert",
  Réalisée: "vert",
  Annulée: "gris",
  Litige: "rouge",
};

type Filtre = "tous" | "non_lus" | "propositions";

export function EcranMessagerie({ conversations }: { conversations: ConversationPrestataire[] }) {
  const [filtre, setFiltre] = useState<Filtre>("tous");

  const nonLus = conversations.filter((c) => c.nonLus > 0).length;
  const propositions = conversations.filter((c) => c.dernierMessageType === "devis").length;

  const filtrees = conversations.filter((c) => {
    if (filtre === "non_lus") return c.nonLus > 0;
    if (filtre === "propositions") return c.dernierMessageType === "devis";
    return true;
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] text-[#1A1917] sm:text-[30px]" style={{ fontFamily: "var(--font-instrument-serif)" }}>
          Messagerie
        </h1>
        <p className="mt-1 text-[13.5px] text-[#6B6660]">Vos coordonnées ne sont transmises au client qu&apos;après validation de la mission.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterPill actif={filtre === "tous"} onClick={() => setFiltre("tous")}>Tous</FilterPill>
        <FilterPill actif={filtre === "non_lus"} onClick={() => setFiltre("non_lus")}>Non lus{nonLus > 0 ? ` (${nonLus})` : ""}</FilterPill>
        <FilterPill actif={filtre === "propositions"} onClick={() => setFiltre("propositions")}>Propositions{propositions > 0 ? ` (${propositions})` : ""}</FilterPill>
      </div>

      {filtrees.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[18px] border border-dashed border-[#DDD8D1] py-16 text-center">
          <MessageCircle className="size-7" style={{ color: "#98938B" }} />
          <p className="text-[13.5px] text-[#6B6660]">Aucune conversation dans ce filtre.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtrees.map((c) => {
            const label = BADGE_STATUT_MISSION_PRESTATAIRE[c.missionStatut];
            return (
              <div key={`${c.missionId}-${c.autreId}`} className="flex flex-wrap items-center gap-3 rounded-[14px] border border-[#EAE6E0] bg-white p-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#F6F4F0] text-[13px] font-bold text-[#1A1917]">
                  {c.autreNom.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[14.5px] font-semibold text-[#1A1917]">{c.autreNom}</p>
                    <Badge tone={TONE_MISSION[label] ?? "gris"}>{label}</Badge>
                    {c.nonLus > 0 && <Badge tone="rouge">{c.nonLus} non lu{c.nonLus > 1 ? "s" : ""}</Badge>}
                  </div>
                  <p className="mt-0.5 truncate text-[12.5px] text-[#6B6660]">{c.lieu}</p>
                  <p className="mt-0.5 truncate text-[13px] text-[#1A1917]">{c.dernierMessage ? `« ${c.dernierMessage} »` : "Aucun message échangé pour l'instant."}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  {c.dernierMessageAt && <span className="text-[11.5px] text-[#98938B]">{ancienneteFr(c.dernierMessageAt)}</span>}
                  <Link href={`/missions/${c.missionId}`}>
                    <DashButton variant="secondaire">Ouvrir</DashButton>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
