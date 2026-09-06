"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { DashButton } from "@/app/prestataire/_components/button";
import { marquerNotificationLue, marquerToutesLues } from "@/app/actions/notifications";
import type { NotificationsRow } from "@/lib/supabase/database.types";

/**
 * "Notifications" — migré depuis l'ancien /tableau-de-bord/notifications
 * (dossier design ne prévoit pas cet écran parmi les 14, mais c'est une
 * vraie fonctionnalité déjà utilisée : conservée, restylée dans le
 * système visuel /client). Logique, données et actions strictement
 * identiques (getNotifications, marquerNotificationLue, marquerToutesLues) —
 * seule l'interface change.
 */
function formatDate(iso: string): string {
  const date = new Date(iso);
  const maintenant = new Date();
  if (date.toDateString() === maintenant.toDateString()) return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const hier = new Date(maintenant);
  hier.setDate(hier.getDate() - 1);
  if (date.toDateString() === hier.toDateString()) return "hier";
  const joursEcoules = Math.floor((maintenant.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (joursEcoules < 7) return date.toLocaleDateString("fr-FR", { weekday: "short" });
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function EcranNotifications({ notificationsInitiales }: { notificationsInitiales: NotificationsRow[] }) {
  const [notifications, setNotifications] = useState(notificationsInitiales);
  const [, startTransition] = useTransition();
  const nonLues = notifications.filter((n) => !n.lu).length;

  function marquer(notif: NotificationsRow) {
    if (notif.lu) return;
    setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, lu: true } : n)));
    startTransition(() => {
      marquerNotificationLue(notif.id);
    });
  }

  function toutMarquer() {
    setNotifications((prev) => prev.map((n) => ({ ...n, lu: true })));
    startTransition(() => {
      marquerToutesLues();
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] text-[#1A1917] sm:text-[30px]" style={{ fontFamily: "var(--font-instrument-serif)" }}>
            Notifications
          </h1>
          <p className="mt-1 text-[13.5px] text-[#6B6660]">Toutes vos notifications, les plus récentes en premier.</p>
        </div>
        {nonLues > 0 && (
          <DashButton variant="secondaire" onClick={toutMarquer}>
            Tout marquer comme lu
          </DashButton>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[18px] border border-dashed border-[#DDD8D1] py-16 text-center">
          <Bell className="size-7" style={{ color: "#98938B" }} />
          <p className="text-[13.5px] text-[#6B6660]">Vos notifications apparaîtront ici.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[18px] border border-[#EAE6E0] bg-white">
          <div className="divide-y divide-[#EFEBE6]">
            {notifications.map((notif) => {
              const contenu = (
                <div
                  className="flex items-start gap-3 px-5 py-[15px] transition-colors hover:bg-[#F6F4F0]"
                  style={{ backgroundColor: notif.lu ? undefined : "#FDECEB" }}
                >
                  <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ backgroundColor: notif.lu ? "#DDD8D1" : "#E21D1B" }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold text-[#1A1917]">{notif.titre}</p>
                    {notif.contenu && <p className="mt-0.5 truncate text-[13px] text-[#6B6660]">{notif.contenu}</p>}
                  </div>
                  <span className="shrink-0 text-[11.5px] text-[#98938B]">{formatDate(notif.created_at)}</span>
                </div>
              );
              return notif.lien ? (
                <Link key={notif.id} href={notif.lien} onClick={() => marquer(notif)}>
                  {contenu}
                </Link>
              ) : (
                <button key={notif.id} type="button" className="block w-full text-left" onClick={() => marquer(notif)}>
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
