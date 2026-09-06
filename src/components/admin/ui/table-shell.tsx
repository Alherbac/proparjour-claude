import { cn } from "@/lib/utils";

/**
 * Conteneur de tableau — piège anti-régression (a) : `overflow-x:
 * auto; overflow-y: hidden` sur le conteneur, un enfant unique avec
 * `min-width` explicite. Sans ça les colonnes se chevauchent en
 * dessous de la largeur cible.
 */
export function AdminTableShell({
  minWidth,
  children,
  className,
}: {
  minWidth: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("a-scroll overflow-x-auto overflow-y-hidden rounded-2xl border border-[var(--a-border)] bg-[var(--a-surface)]", className)}>
      <div style={{ minWidth: `${minWidth}px` }}>{children}</div>
    </div>
  );
}

export function AdminTh({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "border-b border-[var(--a-border)] bg-[var(--a-surface-3)] px-4 py-2.5 text-left text-[11px] font-bold tracking-wide text-[var(--a-text-2)] uppercase",
        className,
      )}
      style={{ fontFamily: "var(--a-font-display)" }}
    >
      {children}
    </th>
  );
}

/** Cellule de texte — piège (d) : min-width:0 + overflow hidden + ellipsis + nowrap, un nom long ne pousse jamais la colonne voisine. */
export function AdminTd({
  children,
  className,
  onClick,
  truncate = false,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  truncate?: boolean;
}) {
  return (
    <td onClick={onClick} className={cn("border-b border-[var(--a-border)]/70 px-4 py-3 text-[13px] text-[var(--a-ink)] last:border-0", className)}>
      {truncate ? <span className="block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{children}</span> : children}
    </td>
  );
}

export function AdminTr({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        "transition-colors",
        onClick && "cursor-pointer",
        active ? "bg-[var(--a-surface-2)]" : onClick && "hover:bg-[var(--a-surface-2)]/60",
      )}
    >
      {children}
    </tr>
  );
}
