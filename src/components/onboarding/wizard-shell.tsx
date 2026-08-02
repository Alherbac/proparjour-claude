import type { ReactNode } from "react";
import { Lightbulb } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Stepper, type StepperItem } from "@/components/onboarding/stepper";

export function WizardShell({
  steps,
  currentIndex,
  tip,
  preview,
  children,
}: {
  steps: StepperItem[];
  currentIndex: number;
  tip: string;
  preview?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-full bg-secondary/30">
      <header className="border-b border-border bg-background px-4 py-4 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <Logo />
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 lg:px-8 lg:py-12">
        <Stepper steps={steps} currentIndex={currentIndex} />

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="rounded-2xl border border-border bg-background p-6 shadow-sm sm:p-8">
            {children}
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-8 space-y-4">
              <div className="flex gap-3 rounded-2xl border border-border bg-background p-4">
                <Lightbulb className="size-5 shrink-0 text-primary" />
                <p className="text-sm text-muted-foreground">{tip}</p>
              </div>
              {preview}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
