"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_GROUPES, NAV_AUTRES, type NavBadgeKey } from "@/components/admin/shell/admin-nav-config";
import { signOutAction } from "@/app/actions/auth";

export type AdminBadges = Partial<Record<NavBadgeKey, number>>;

function estActif(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ href, label, badge, actif }: { href: string; label: string; badge?: number; actif: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-[9px] px-[10px] py-[9px] text-[12.5px] font-semibold transition-colors",
        actif ? "bg-[var(--a-nav-active)] text-white" : "text-[var(--a-nav-text)] hover:bg-[var(--a-nav-active)]/60 hover:text-white",
      )}
      style={{ fontFamily: "var(--a-font-display)" }}
    >
      <span
        className={cn("size-[5px] shrink-0 rounded-full", actif ? "bg-[var(--a-accent)]" : "bg-[var(--a-nav-dot)]")}
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {Boolean(badge) && (
        <span
          className="shrink-0 rounded-full border px-[7px] py-[1px] text-[10.5px] font-bold"
          style={{
            background: "rgba(224,90,58,0.18)",
            borderColor: "rgba(224,90,58,0.34)",
            color: "#f0a48d",
          }}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}

export function AdminSidebar({
  badges = {},
  nomComplet,
  roleLabel,
  onOuvrirSimulation,
}: {
  badges?: AdminBadges;
  nomComplet: string;
  roleLabel: string;
  onOuvrirSimulation: () => void;
}) {
  const pathname = usePathname();
  const initiales = (nomComplet.trim().charAt(0) || "A").toUpperCase();

  return (
    <aside
      className="flex h-full w-[236px] shrink-0 flex-col"
      style={{ background: "var(--a-nav-bg)" }}
    >
      <div className="shrink-0 px-4 pt-5 pb-4">
        <Link href="/" className="text-[17px] font-extrabold text-white" style={{ fontFamily: "var(--a-font-display)" }}>
          Pro<span style={{ color: "var(--a-accent)" }}>Par</span>Jour
        </Link>
        <p className="mt-0.5 text-[11px] text-[var(--a-nav-text)]">Back-office</p>
      </div>

      <nav className="a-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {NAV_GROUPES.map((groupe) => (
          <div key={groupe.titre} className="mb-4">
            <p
              className="mb-1.5 px-[10px] text-[9.5px] font-bold tracking-[0.16em] text-[var(--a-text-2)] uppercase"
              style={{ fontFamily: "var(--a-font-display)" }}
            >
              {groupe.titre}
            </p>
            <div className="flex flex-col gap-0.5">
              {groupe.items.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  badge={item.badgeKey ? badges[item.badgeKey] : undefined}
                  actif={estActif(pathname, item.href)}
                />
              ))}
            </div>
          </div>
        ))}

        <div className="mt-1 border-t pt-3" style={{ borderColor: "var(--a-nav-sep)" }}>
          <p
            className="mb-1.5 px-[10px] text-[9.5px] font-bold tracking-[0.16em] text-[var(--a-text-2)] uppercase"
            style={{ fontFamily: "var(--a-font-display)" }}
          >
            {NAV_AUTRES.titre}
          </p>
          <div className="flex flex-col gap-0.5">
            {NAV_AUTRES.items.map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} actif={estActif(pathname, item.href)} />
            ))}
          </div>
        </div>
      </nav>

      <div className="shrink-0 border-t px-3 py-3" style={{ borderColor: "var(--a-nav-sep)" }}>
        <button
          type="button"
          onClick={onOuvrirSimulation}
          className="mb-3 flex w-full items-center gap-2 rounded-[9px] border px-[10px] py-[9px] text-left text-[12px] font-semibold text-[var(--a-nav-text)] transition-colors hover:text-white"
          style={{ borderColor: "var(--a-nav-field-border)", fontFamily: "var(--a-font-display)" }}
        >
          <span className="size-[7px] shrink-0 rounded-full" style={{ background: "var(--a-orange)" }} aria-hidden />
          Mode simulation
        </button>
        <div className="flex items-center gap-2.5 px-[2px]">
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white"
            style={{ background: "var(--a-accent)", fontFamily: "var(--a-font-display)" }}
          >
            {initiales}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-semibold text-white">{nomComplet}</p>
            <p className="text-[10.5px] text-[var(--a-nav-text)]">{roleLabel}</p>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="shrink-0 text-[10.5px] font-semibold text-[var(--a-nav-text)] underline decoration-dotted underline-offset-2 hover:text-white"
            >
              Quitter
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
