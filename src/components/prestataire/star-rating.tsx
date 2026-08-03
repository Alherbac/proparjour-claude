import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({
  note,
  size = "sm",
  className,
}: {
  note: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const iconSize = size === "md" ? "size-5" : "size-3.5";
  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={cn(
            iconSize,
            index < Math.round(note)
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/30",
          )}
        />
      ))}
    </div>
  );
}
