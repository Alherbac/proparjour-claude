import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function ChipMultiSelect({
  options,
  value,
  onChange,
}: {
  options: readonly string[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = value.includes(option);
        return (
          <button
            key={option}
            type="button"
            aria-pressed={selected}
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
