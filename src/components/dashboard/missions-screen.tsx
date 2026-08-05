"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { List, CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";
import { MissionCardPrestataire } from "@/components/dashboard/mission-card-prestataire";
import { CalendrierMissions } from "@/components/dashboard/calendrier-missions";
import { useNotificationsRealtime } from "@/hooks/use-notifications-realtime";
import { rafraichirLignePrestataire } from "@/app/actions/missions";
import { rafraichirMessagesNonLus } from "@/app/actions/messages";
import type { LigneProposee } from "@/lib/missions";
import type { NotificationsRow } from "@/lib/supabase/database.types";

const GROUPES = [
  { cle: "a_repondre", label: "À répondre" },
  { cle: "a_venir", label: "À venir" },
  { cle: "terminees", label: "Terminées" },
] as const;

const TYPES_MISSION_MISE_A_JOUR = [
  "mission_acceptee",
  "mission_refusee",
  "mission_annulee",
  "service_fait_declare",
  "paiement_libere",
  "litige",
];

function groupe(ligne: LigneProposee): (typeof GROUPES)[number]["cle"] {
  if (ligne.statut_acceptation === "en_attente") return "a_repondre";
  if (
    ["terminee", "annulee", "litige"].includes(ligne.mission.statut) ||
    ligne.statut_acceptation === "refusee"
  ) {
    return "terminees";
  }
  return "a_venir";
}

export function MissionsScreen({
  userId,
  lignes: lignesInitiales,
  messagesNonLusParMission: messagesInitiaux,
}: {
  userId: string;
  lignes: LigneProposee[];
  messagesNonLusParMission: Record<string, number>;
}) {
  const router = useRouter();
  const [vue, setVue] = useState<"liste" | "calendrier">("liste");
  const [ongletActif, setOngletActif] = useState<(typeof GROUPES)[number]["cle"]>("a_repondre");
  const [lignes, setLignes] = useState(lignesInitiales);
  const [messagesNonLusParMission, setMessagesNonLusParMission] = useState(messagesInitiaux);

  // Resynchronise l'état local quand le serveur repasse des props
  // fraîches (ex. router.refresh() après une action) — motif
  // recommandé par React pour ajuster l'état pendant le rendu plutôt
  // que dans un effet.
  const [lignesPrecedentes, setLignesPrecedentes] = useState(lignesInitiales);
  if (lignesInitiales !== lignesPrecedentes) {
    setLignesPrecedentes(lignesInitiales);
    setLignes(lignesInitiales);
  }
  const [messagesPrecedents, setMessagesPrecedents] = useState(messagesInitiaux);
  if (messagesInitiaux !== messagesPrecedents) {
    setMessagesPrecedents(messagesInitiaux);
    setMessagesNonLusParMission(messagesInitiaux);
  }

  const surNotification = useCallback(
    async (notification: NotificationsRow) => {
      if (!notification.mission_id) return;

      if (notification.type === "nouveau_message") {
        const compte = await rafraichirMessagesNonLus(notification.mission_id);
        setMessagesNonLusParMission((prev) => ({ ...prev, [notification.mission_id!]: compte }));
        return;
      }

      if (notification.type === "mission_proposee") {
        router.refresh();
        return;
      }

      if (TYPES_MISSION_MISE_A_JOUR.includes(notification.type)) {
        const fraiche = await rafraichirLignePrestataire(notification.mission_id);
        if (!fraiche) return;
        setLignes((prev) => prev.map((l) => (l.mission_id === fraiche.mission_id ? fraiche : l)));
      }
    },
    [router],
  );

  useNotificationsRealtime(userId, surNotification);

  const parGroupe = GROUPES.map((g) => ({
    ...g,
    lignes: lignes.filter((l) => groupe(l) === g.cle),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold text-foreground">Mes missions</h1>
        <div className="flex gap-1 rounded-full border border-border p-1">
          <button
            type="button"
            aria-label="Vue liste"
            aria-pressed={vue === "liste"}
            onClick={() => setVue("liste")}
            className={cn(
              "flex size-8 items-center justify-center rounded-full",
              vue === "liste" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            <List className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Vue calendrier"
            aria-pressed={vue === "calendrier"}
            onClick={() => setVue("calendrier")}
            className={cn(
              "flex size-8 items-center justify-center rounded-full",
              vue === "calendrier" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            <CalendarRange className="size-4" />
          </button>
        </div>
      </div>

      {vue === "calendrier" ? (
        <CalendrierMissions lignes={lignes} messagesNonLusParMission={messagesNonLusParMission} />
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto">
            {parGroupe.map((g) => (
              <button
                key={g.cle}
                type="button"
                aria-pressed={ongletActif === g.cle}
                onClick={() => setOngletActif(g.cle)}
                className={cn(
                  "shrink-0 rounded-full px-4 py-2 text-sm font-medium",
                  ongletActif === g.cle
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground",
                )}
              >
                {g.label} {g.lignes.length > 0 && `(${g.lignes.length})`}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {parGroupe
              .find((g) => g.cle === ongletActif)!
              .lignes.map((ligne) => (
                <MissionCardPrestataire
                  key={ligne.id}
                  ligne={ligne}
                  messagesNonLus={messagesNonLusParMission[ligne.mission_id] ?? 0}
                />
              ))}
            {parGroupe.find((g) => g.cle === ongletActif)!.lignes.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">Rien ici pour l&apos;instant.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
