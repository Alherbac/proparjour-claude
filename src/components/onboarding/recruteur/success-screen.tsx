import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";

export function RecruteurSuccessScreen() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-secondary/30 px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-8 text-center shadow-sm">
        <div className="mb-4 flex justify-center">
          <Logo />
        </div>
        <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CheckCircle2 className="size-7" />
        </span>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          Compte créé avec succès
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Vous pouvez dès maintenant rechercher et réserver des prestataires
          en Île-de-France.
        </p>
        <Button
          render={<Link href="/prestataires" />}
          className="mt-6 w-full rounded-full"
        >
          Rechercher un prestataire
        </Button>
      </div>
    </div>
  );
}
