"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Radar,
  LayoutDashboard,
  Users,
  ShieldCheck,
  Briefcase,
  Megaphone,
  MessageSquare,
  Wallet,
  Percent,
  FileText,
  BarChart3,
  Target,
  MapPin,
  ScrollText,
  UserX,
  Download,
  Eye,
  Settings,
  Search,
  Store,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ModuleDef = {
  href: string;
  label: string;
  icon: typeof Radar;
  badgeKey?: keyof AdminBadges;
};

export type AdminBadges = {
  validations?: number;
  messages?: number;
  pilotage?: number;
  suppressions?: number;
};

const GROUPES: { titre: string; modules: ModuleDef[] }[] = [
  {
    titre: "Pilotage",
    modules: [{ href: "/admin/pilotage", label: "Pilotage & Alertes", icon: Radar, badgeKey: "pilotage" }],
  },
  {
    titre: "Principal",
    modules: [
      { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
      { href: "/admin/utilisateurs", label: "Utilisateurs", icon: Users },
      { href: "/admin/validations", label: "Validation", icon: ShieldCheck, badgeKey: "validations" },
      { href: "/admin/missions", label: "Missions", icon: Briefcase },
      { href: "/admin/offres", label: "Offres", icon: Megaphone },
      { href: "/admin/annuaire-prestataires", label: "Annuaire prestataires", icon: Search },
      { href: "/admin/marche-offres", label: "Marché des offres", icon: Store },
      { href: "/admin/messages", label: "Messages", icon: MessageSquare, badgeKey: "messages" },
    ],
  },
  {
    titre: "Finances",
    modules: [
      { href: "/admin/versements", label: "Versements", icon: Wallet },
      { href: "/admin/commissions", label: "Commissions", icon: Percent },
      { href: "/admin/factures", label: "Factures", icon: FileText },
    ],
  },
  {
    titre: "Analyse",
    modules: [
      { href: "/admin/stats", label: "Statistiques", icon: BarChart3 },
      { href: "/admin/kpis", label: "KPI stratégiques", icon: Target },
    ],
  },
  {
    titre: "Outils",
    modules: [
      { href: "/admin/villes", label: "Villes / zones", icon: MapPin },
      { href: "/admin/cgu", label: "CGU", icon: ScrollText },
      { href: "/admin/suppressions", label: "Suppressions", icon: UserX, badgeKey: "suppressions" },
      { href: "/admin/export", label: "Export données", icon: Download },
      { href: "/admin/simulation", label: "Simulation", icon: Eye },
      { href: "/admin/parametres", label: "Paramètres", icon: Settings },
    ],
  },
];

export function AdminSidebar({ badges = {} }: { badges?: AdminBadges }) {
  const pathname = usePathname();
  const [replies, setReplies] = useState<Record<string, boolean>>({});

  function toggle(titre: string) {
    setReplies((prev) => ({ ...prev, [titre]: !prev[titre] }));
  }

  return (
    <nav className="flex h-full w-64 shrink-0 flex-col overflow-y-auto bg-neutral-950 py-4 text-neutral-300">
      <div className="px-5 pb-4">
        <span className="font-heading text-lg font-semibold text-white">
          Pro<span className="text-primary">Par</span>Jour
        </span>
        <p className="mt-0.5 text-xs text-neutral-500">Back-office</p>
      </div>

      {GROUPES.map((groupe) => {
        const replie = replies[groupe.titre] ?? false;
        return (
          <div key={groupe.titre} className="px-2 pb-1">
            <button
              type="button"
              onClick={() => toggle(groupe.titre)}
              className="flex w-full items-center justify-between px-3 py-1.5 text-xs font-semibold tracking-wide text-neutral-500 uppercase hover:text-neutral-300"
            >
              {groupe.titre}
              <ChevronDown className={cn("size-3.5 transition-transform", replie && "-rotate-90")} />
            </button>

            {!replie && (
              <div className="flex flex-col gap-0.5">
                {groupe.modules.map((module) => {
                  const actif = module.href === "/admin" ? pathname === "/admin" : pathname.startsWith(module.href);
                  const Icon = module.icon;
                  const badge = module.badgeKey ? badges[module.badgeKey] : undefined;
                  return (
                    <Link
                      key={module.href}
                      href={module.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        actif ? "bg-primary text-primary-foreground" : "hover:bg-white/5 hover:text-white",
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{module.label}</span>
                      {Boolean(badge) && (
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-red-500 text-[11px] font-semibold text-white">
                          {badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
