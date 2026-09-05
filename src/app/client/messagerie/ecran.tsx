"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { FilterPill } from "@/app/client/_components/filter-pill";
import { Badge } from "@/app/client/_components/badge";
import { DashButton } from "@/app/client/_components/button";
import { ancienneteFr, BADGE_STATUT_MISSION } from "@/app/client/_lib";
import type { ConversationClient } from "@/app/client/_types";

type Filtre = "tous" | "non_lus" | "devis";

/**
 * "Ouvrir" une conversation renvoie vers le fil réel existant
 * (/missions/[id]) — la messagerie complète (composeur, temps réel,
 * envoi/acceptation de devis) est une fonctionnalité déjà réelle et
 * fonctionnelle du site, hors périmètre /client (Règle N°0) ; cet
 * écran reconstruit fidèlement la LISTE décrite par le dossier
 * design, pas un second système de chat.
 */
export function EcranMessagerie({ conversations }: { conversations: ConversationClient[] }) {
  const [filtre, setFiltre] = useState<Filtre>("tous");

  const nonLus = conversations.filter((c) => c.nonLus > 0).length;
  const devisEnAttente = conversations.filter((c) => c.dernierMessageType === "devis").length;

  const filtrees = conversations.filter((c) => {
    if (filtre === "non_lus") return c.nonLus > 0;
    if (filtre === "devis") return c.dernierMessageType === "devis";
    return true;
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] text-[#1A1917] sm:text-[30px]" style={{ fontFamily: "var(--font-instrument-serif)" }}>
          Messagerie
        </h1>
        <p className="mt-1 text-[13.5px] text-[#6B6660]">Les coordonnées personnelles restent masquées jusqu&apos;à la validation de la mission.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterPill actif={filtre === "tous"} onClick={() => setFiltre("tous")}>Tous</FilterPill>
        <FilterPill actif={filtre === "non_lus"} onClick={() => setFiltre("non_lus")}>Non lus{nonLus > 0 ? ` (${nonLus})` : ""}</FilterPill>
        <FilterPill actif={filtre === "devis"} onClick={() => setFiltre("devis")}>Devis en attente{devisEnAttente > 0 ? ` (${devisEnAttente})` : ""}</FilterPill>
      </div>

      {filtrees.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[18px] border border-dashed border-[#DDD8D1] py-16 text-center">
          <MessageCircle className="size-7" style={{ color: "#98938B" }} />
          <p className="text-[13.5px] text-[#6B6660]">Aucune conversation dans ce filtre.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtrees.map((c) => (
            <div key={`${c.missionId}-${c.autreId}`} className="flex flex-wrap items-center gap-3 rounded-[14px] border border-[#EAE6E0] bg-white p-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#F6F4F0] text-[13px] font-bold text-[#1A1917]">
                {c.autreNom.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[14.5px] font-semibold text-[#1A1917]">{c.autreNom}</p>
                  <Badge tone={BADGE_STATUT_MISSION[c.missionStatut].tone}>{BADGE_STATUT_MISSION[c.missionStatut].label}</Badge>
                  {c.nonLus > 0 && <Badge tone="rouge">{c.nonLus} non lu{c.nonLus > 1 ? "s" : ""}</Badge>}
                </div>
                <p className="mt-0.5 truncate text-[12.5px] text-[#6B6660]">{c.lieu}</p>
                <p className="mt-0.5 truncate text-[13px] text-[#1A1917]">
                  {c.dernierMessage ? `« ${c.dernierMessage} »` : "Aucun message échangé pour l'instant."}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                {c.dernierMessageAt && <span className="text-[11.5px] text-[#98938B]">{ancienneteFr(c.dernierMessageAt)}</span>}
                <Link href={`/missions/${c.missionId}`}>
                  <DashButton variant="secondaire">Ouvrir</DashButton>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
