import { cn } from "@/lib/utils";

/** Carte de section générique — radius 14-16px, bordure 1px, aucune ombre (§2). */
export function AdminSection({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-[var(--a-border)] bg-[var(--a-surface)] p-5", className)}>
      {(title || action) && (
        <div className="mb-3.5 flex items-center justify-between gap-3">
          {title && (
            <h2 className="text-[14.5px] font-bold text-[var(--a-ink)]" style={{ fontFamily: "var(--a-font-display)" }}>
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function AdminH1({ children, size = "26" }: { children: React.ReactNode; size?: "26" | "30" }) {
  return (
    <h1
      className={cn("font-extrabold tracking-[-0.02em] text-[var(--a-ink)]", size === "30" ? "text-[30px]" : "text-[26px]")}
      style={{ fontFamily: "var(--a-font-display)", lineHeight: 1.08 }}
    >
      {children}
    </h1>
  );
}
