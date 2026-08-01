import { Search, Briefcase, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export function SearchBar({ className }: { className?: string }) {
  return (
    <form
      className={cn(
        "flex w-full max-w-xl items-center rounded-full border border-border bg-background shadow-sm",
        className,
      )}
    >
      <label className="flex flex-1 items-center gap-2 px-4 py-2.5 min-w-0">
        <Briefcase className="size-4 shrink-0 text-muted-foreground" />
        <input
          type="text"
          name="metier"
          placeholder="Métier..."
          className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </label>
      <div className="h-6 w-px shrink-0 bg-border" />
      <label className="flex flex-1 items-center gap-2 px-4 py-2.5 min-w-0">
        <MapPin className="size-4 shrink-0 text-muted-foreground" />
        <input
          type="text"
          name="ville"
          placeholder="Ville..."
          className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </label>
      <button
        type="submit"
        aria-label="Rechercher"
        className="m-1 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90"
      >
        <Search className="size-4" />
      </button>
    </form>
  );
}
