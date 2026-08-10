import { cn } from "@/lib/utils";

export function SectionHead({
  eyebrow,
  titre,
  description,
  tone = "light",
  className,
}: {
  eyebrow: string;
  titre: string;
  description?: string;
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <div className={cn("mb-[60px] max-w-[600px]", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-[9px] font-mono-landing text-xs font-medium uppercase tracking-[0.12em] before:size-1.5 before:rounded-full before:content-['']",
          tone === "dark"
            ? "text-white/50 before:bg-gold before:shadow-[0_0_0_4px_rgba(217,164,65,0.18)]"
            : "text-muted-landing before:bg-emerald before:shadow-[0_0_0_4px_rgba(24,154,108,0.14)]",
        )}
      >
        {eyebrow}
      </span>
      <h2
        className={cn(
          "mt-4 text-[34px] font-semibold",
          tone === "dark" ? "text-white" : "text-ink",
        )}
      >
        {titre}
      </h2>
      {description && (
        <p
          className={cn(
            "mt-3.5 text-base leading-[1.65]",
            tone === "dark" ? "text-white/55" : "text-muted-landing",
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}
