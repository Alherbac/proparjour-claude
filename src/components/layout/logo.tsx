import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "flex items-center gap-2 shrink-0 font-heading",
        className,
      )}
    >
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground text-lg font-semibold">
        P
      </span>
      <span className="text-xl font-semibold tracking-tight text-foreground">
        Pro<span className="text-primary">Par</span>Jour
      </span>
    </Link>
  );
}
