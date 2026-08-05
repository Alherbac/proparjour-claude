"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { MissionCardRecruteur } from "@/components/dashboard/mission-card-recruteur";
import { useNotificationsRealtime } from "@/hooks/use-notifications-realtime";
import { rafraichirMissionRecruteur } from "@/app/actions/missions";
import { rafraichirMessagesNonLus } from "@/app/actions/messages";
import type { MissionAvecLignes } from "@/lib/missions";
import type { NotificationsRow } from "@/lib/supabase/database.types";

const GROUPES = [
  { cle: "en_attente", label: "En attente" },
  { cle: "confirmees", label: "Confirmées" },
  { cle: "terminees", label: "Terminées" },
] as const;

const TYPES_MISSION_MISE_A_JOUR = ["mission_acceptee", "mission_refusee", "service_fait_declare"];

function groupe(mission: MissionAvecLignes): (typeof GROUPES)[number]["cle"] {
  if (mission.statut === "en_attente") return "en_attente";
  if (mission.statut === "confirmee" || mission.statut === "en_cours") return "confirmees";
  return "terminees";
}

export function MissionsScreenRecruteur({
  userId,
  missions: missionsInitiales,
  messagesNonLusParMission: messagesInitiaux,
}: {
  userId: string;
  missions: MissionAvecLignes[];
  messagesNonLusParMission: Record<string, number>;
}) {
  const [ongletActif, setOngletActif] = useState<(typeof GROUPES)[number]["cle"]>("en_attente");
  const [missions, setMissions] = useState(missionsInitiales);
  const [messagesNonLusParMission, setMessagesNonLusParMission] = useState(messagesInitiaux);

  // Resynchronise l'état local quand le serveur repasse des props
  // fraîches (ex. router.refresh() après une action) — motif
  // recommandé par React pour ajuster l'état pendant le rendu plutôt
  // que dans un effet.
  const [missionsPrecedentes, setMissionsPrecedentes] = useState(missionsInitiales);
  if (missionsInitiales !== missionsPrecedentes) {
    setMissionsPrecedentes(missionsInitiales);
    setMissions(missionsInitiales);
  }
  const [messagesPrecedents, setMessagesPrecedents] = useState(messagesInitiaux);
  if (messagesInitiaux !== messagesPrecedents) {
    setMessagesPrecedents(messagesInitiaux);
    setMessagesNonLusParMission(messagesInitiaux);
  }

  const surNotification = useCallback(async (notification: NotificationsRow) => {
    if (!notification.mission_id) return;

    if (notification.type === "nouveau_message") {
      const compte = await rafraichirMessagesNonLus(notification.mission_id);
      setMessagesNonLusParMission((prev) => ({ ...prev, [notification.mission_id!]: compte }));
      return;
    }

    if (TYPES_MISSION_MISE_A_JOUR.includes(notification.type)) {
      const fraiche = await rafraichirMissionRecruteur(notification.mission_id);
      if (!fraiche) return;
      setMissions((prev) => prev.map((m) => (m.id === fraiche.id ? fraiche : m)));
    }
  }, []);

  useNotificationsRealtime(userId, surNotification);

  const parGroupe = GROUPES.map((g) => ({
    ...g,
    missions: missions.filter((m) => groupe(m) === g.cle),
  }));

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-semibold text-foreground">Mes missions</h1>

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
            {g.label} {g.missions.length > 0 && `(${g.missions.length})`}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {parGroupe
          .find((g) => g.cle === ongletActif)!
          .missions.map((mission) => (
            <MissionCardRecruteur
              key={mission.id}
              mission={mission}
              messagesNonLus={messagesNonLusParMission[mission.id] ?? 0}
            />
          ))}
        {parGroupe.find((g) => g.cle === ongletActif)!.missions.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">Rien ici pour l&apos;instant.</p>
        )}
      </div>
    </div>
  );
}
