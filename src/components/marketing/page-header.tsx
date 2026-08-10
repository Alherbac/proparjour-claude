export function MarketingPageHeader({
  eyebrow,
  titre,
  description,
}: {
  eyebrow: string;
  titre: string;
  description?: string;
}) {
  return (
    <div className="border-b border-line bg-paper-dim px-10 py-16 max-[900px]:px-6 max-[900px]:py-11">
      <div className="mx-auto max-w-[1200px]">
        <span className="inline-flex items-center gap-[9px] font-mono-landing text-xs font-medium uppercase tracking-[0.12em] text-muted-landing before:size-1.5 before:rounded-full before:bg-emerald before:shadow-[0_0_0_4px_rgba(24,154,108,0.14)] before:content-['']">
          {eyebrow}
        </span>
        <h1 className="mt-4 max-w-[640px] text-[38px] font-semibold text-ink">{titre}</h1>
        {description && (
          <p className="mt-3.5 max-w-[560px] text-base leading-[1.65] text-muted-landing">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
