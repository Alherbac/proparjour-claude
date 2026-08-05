"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { NotificationsRow } from "@/lib/supabase/database.types";

/**
 * Écoute le même canal Realtime que la cloche 🔔 (notifications
 * filtrées par user_id, déjà validé à l'Étape 7), pour permettre à
 * un tableau de bord de rafraîchir juste la carte concernée à la
 * réception d'un événement lié à une mission — sans reload, sans
 * refetch de toute la liste (Phase 3).
 */
export function useNotificationsRealtime(
  userId: string,
  onNotification: (notification: NotificationsRow) => void,
) {
  const callbackRef = useRef(onNotification);
  useEffect(() => {
    callbackRef.current = onNotification;
  }, [onNotification]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`dashboard-sync-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => callbackRef.current(payload.new as NotificationsRow),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
}
