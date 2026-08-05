"use client";

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
  Percent,
  FileText,
  BarChart3,
  Target,
  MapPin,
  ScrollText,
  UserX,
  Eye,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MODULES = [
  { href: "/admin/pilotage", label: "Pilotage & Alertes", icon: Radar },
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/admin/utilisateurs", label: "Utilisateurs", icon: Users },
  { href: "/admin/validations", label: "Validation", icon: ShieldCheck },
  { href: "/admin/missions", label: "Missions", icon: Briefcase },
  { href: "/admin/offres", label: "Offres", icon: Megaphone },
  { href: "/admin/messages", label: "Messages", icon: MessageSquare },
  { href: "/admin/commissions", label: "Commissions", icon: Percent },
  { href: "/admin/factures", label: "Factures", icon: FileText },
  { href: "/admin/stats", label: "Statistiques", icon: BarChart3 },
  { href: "/admin/kpis", label: "KPI stratégiques", icon: Target },
  { href: "/admin/villes", label: "Villes / zones", icon: MapPin },
  { href: "/admin/cgu", label: "CGU", icon: ScrollText },
  { href: "/admin/suppressions", label: "Suppressions", icon: UserX },
  { href: "/admin/simulation", label: "Simulation", icon: Eye },
  { href: "/admin/parametres", label: "Paramètres", icon: Settings },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex h-full w-64 shrink-0 flex-col overflow-y-auto bg-neutral-950 py-4 text-neutral-300">
      <div className="px-5 pb-4">
        <span className="font-heading text-lg font-semibold text-white">
          Pro<span className="text-primary">Par</span>Jour
        </span>
        <p className="mt-0.5 text-xs text-neutral-500">Back-office</p>
      </div>
      <div className="flex flex-col gap-0.5 px-2">
        {MODULES.map((module) => {
          const actif = module.href === "/admin" ? pathname === "/admin" : pathname.startsWith(module.href);
          const Icon = module.icon;
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
              {module.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
