import { Construction } from "lucide-react";

export function ModuleAVenir({ titre, lot }: { titre: string; lot: string }) {
  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold text-foreground">{titre}</h1>
      <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-background py-16 text-center">
        <Construction className="size-8 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Module à venir</p>
        <p className="text-sm text-muted-foreground">Prévu au {lot}.</p>
      </div>
    </div>
  );
}
