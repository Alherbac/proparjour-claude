"use client";

import { cn } from "@/lib/utils";

export function AdminTabs<T extends string>({
  tabs,
  actif,
  onChange,
}: {
  tabs: { value: T; label: string }[];
  actif: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-[var(--a-border)]">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={cn(
            "relative -mb-px shrink-0 rounded-t-[9px] px-3.5 py-2.5 text-[13px] font-bold transition-colors",
            actif === tab.value ? "text-[var(--a-ink)]" : "text-[var(--a-text-2)] hover:text-[var(--a-ink)]",
          )}
          style={{ fontFamily: "var(--a-font-display)" }}
        >
          {tab.label}
          {actif === tab.value && <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-[var(--a-accent)]" />}
        </button>
      ))}
    </div>
  );
}
