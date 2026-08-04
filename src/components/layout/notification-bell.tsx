"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { marquerNotificationLue, marquerToutesLues } from "@/app/actions/notifications";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NotificationsRow } from "@/lib/supabase/database.types";

function tempsEcoule(dateIso: string): string {
  const secondes = Math.round((Date.now() - new Date(dateIso).getTime()) / 1000);
  if (secondes < 60) return "à l'instant";
  const minutes = Math.round(secondes / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.round(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;
  const jours = Math.round(heures / 24);
  return `il y a ${jours} j`;
}

export function NotificationBell({
  userId,
  notificationsInitiales,
}: {
  userId: string;
  notificationsInitiales: NotificationsRow[];
}) {
  const [notifications, setNotifications] = useState(notificationsInitiales);
  const [ouvert, setOuvert] = useState(false);
  const conteneurRef = useRef<HTMLDivElement>(null);

  const nonLues = notifications.filter((n) => !n.lu).length;

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const notif = payload.new as NotificationsRow;
          setNotifications((prev) => (prev.some((n) => n.id === notif.id) ? prev : [notif, ...prev]));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    function fermerSiExterieur(e: MouseEvent) {
      if (conteneurRef.current && !conteneurRef.current.contains(e.target as Node)) {
        setOuvert(false);
      }
    }
    document.addEventListener("mousedown", fermerSiExterieur);
    return () => document.removeEventListener("mousedown", fermerSiExterieur);
  }, []);

  async function handleClicNotification(notif: NotificationsRow) {
    if (!notif.lu) {
      setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, lu: true } : n)));
      await marquerNotificationLue(notif.id);
    }
    setOuvert(false);
  }

  async function handleToutMarquer() {
    setNotifications((prev) => prev.map((n) => ({ ...n, lu: true })));
    await marquerToutesLues();
  }

  return (
    <div ref={conteneurRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Notifications"
        className="relative rounded-full text-muted-foreground"
        onClick={() => setOuvert((v) => !v)}
      >
        <Bell className="size-5" />
        {nonLues > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
            {nonLues > 9 ? "9+" : nonLues}
          </span>
        )}
      </Button>

      {ouvert && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-sm font-semibold">Notifications</p>
            {nonLues > 0 && (
              <button
                type="button"
                onClick={handleToutMarquer}
                className="text-xs font-medium text-primary hover:underline"
              >
                Tout marquer lu
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                Aucune notification pour l&apos;instant.
              </p>
            )}
            {notifications.map((notif) => {
              const contenu = (
                <div
                  className={cn(
                    "flex flex-col gap-0.5 border-b border-border px-3 py-2.5 text-sm last:border-b-0 hover:bg-secondary/50",
                    !notif.lu && "bg-primary/5",
                  )}
                >
                  <p className="font-medium text-foreground">{notif.titre}</p>
                  {notif.contenu && <p className="text-muted-foreground">{notif.contenu}</p>}
                  <p className="text-xs text-muted-foreground">{tempsEcoule(notif.created_at)}</p>
                </div>
              );
              return notif.lien ? (
                <Link key={notif.id} href={notif.lien} onClick={() => handleClicNotification(notif)}>
                  {contenu}
                </Link>
              ) : (
                <button
                  key={notif.id}
                  type="button"
                  className="block w-full text-left"
                  onClick={() => handleClicNotification(notif)}
                >
                  {contenu}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
