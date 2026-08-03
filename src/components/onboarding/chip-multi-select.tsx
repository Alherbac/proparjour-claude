import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function ChipMultiSelect({
  options,
  value,
  onChange,
  max,
}: {
  options: readonly string[];
  value: string[];
  onChange: (next: string[]) => void;
  /** Une fois cette limite atteinte, les options non sélectionnées sont désactivées. */
  max?: number;
}) {
  const limitReached = max !== undefined && value.length >= max;

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = value.includes(option);
        const disabled = !selected && limitReached;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={selected}
            disabled={disabled}
            onClick={() =>
              onChange(
                selected
                  ? value.filter((v) => v !== option)
                  : [...value, option],
              )
            }
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              selected
                ? "border-primary bg-primary/10 text-primary"
                : disabled
                  ? "cursor-not-allowed border-border text-muted-foreground/50"
                  : "border-border text-foreground hover:border-primary/40",
            )}
          >
            {selected && <Check className="size-3.5" />}
            {option}
          </button>
        );
      })}
    </div>
  );
}
