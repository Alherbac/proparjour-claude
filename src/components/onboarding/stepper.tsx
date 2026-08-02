import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepperItem = { id: string; title: string };

export function Stepper({
  steps,
  currentIndex,
}: {
  steps: StepperItem[];
  currentIndex: number;
}) {
  const progress = ((currentIndex + 1) / steps.length) * 100;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>
          Étape {currentIndex + 1} sur {steps.length}
        </span>
        <span>{steps[currentIndex]?.title}</span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <ol className="mt-4 hidden items-center gap-2 lg:flex">
        {steps.map((step, index) => {
          const state =
            index < currentIndex
              ? "done"
              : index === currentIndex
                ? "current"
                : "upcoming";
          return (
            <li key={step.id} className="flex flex-1 items-center gap-2">
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                  state === "done" && "bg-primary text-primary-foreground",
                  state === "current" &&
                    "bg-primary/15 text-primary ring-2 ring-primary",
                  state === "upcoming" && "bg-muted text-muted-foreground",
                )}
              >
                {state === "done" ? <Check className="size-3.5" /> : index + 1}
              </span>
              {index < steps.length - 1 && (
                <span
                  className={cn(
                    "h-px flex-1 bg-border",
                    state === "done" && "bg-primary",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
