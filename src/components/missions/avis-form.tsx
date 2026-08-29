"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { laisserAvis } from "@/app/actions/avis";

export function AvisForm({ missionLigneId, autreNom }: { missionLigneId: string; autreNom: string }) {
  const router = useRouter();
  const [note, setNote] = useState(0);
  const [survol, setSurvol] = useState(0);
  const [commentaire, setCommentaire] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoye, setEnvoye] = useState(false);

  async function handleSubmit() {
    if (note < 1) {
      setErreur("Choisissez une note avant d'envoyer.");
      return;
    }
    setEnvoi(true);
    setErreur(null);
    const result = await laisserAvis(missionLigneId, note, commentaire);
    setEnvoi(false);
    if (result.success) {
      setEnvoye(true);
      router.refresh();
    } else {
      setErreur(result.error);
    }
  }

  if (envoye) {
    return (
      <div className="rounded-2xl border border-border bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">
        Merci, votre avis sur {autreNom} a été enregistré.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border p-4">
      <p className="text-sm font-medium text-foreground">Laisser un avis à {autreNom}</p>
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, index) => {
          const valeur = index + 1;
          return (
            <button
              key={valeur}
              type="button"
              aria-label={`${valeur} étoile${valeur > 1 ? "s" : ""}`}
              onMouseEnter={() => setSurvol(valeur)}
              onMouseLeave={() => setSurvol(0)}
              onClick={() => setNote(valeur)}
              className="p-0.5"
            >
              <Star
                className={cn(
                  "size-6",
                  valeur <= (survol || note) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30",
                )}
              />
            </button>
          );
        })}
      </div>
      <textarea
        value={commentaire}
        onChange={(e) => setCommentaire(e.target.value)}
        maxLength={1000}
        rows={3}
        placeholder="Un commentaire (optionnel)..."
        className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
      {erreur && <p className="text-xs text-destructive">{erreur}</p>}
      <Button size="sm" className="rounded-full" disabled={envoi} onClick={handleSubmit}>
        {envoi && <Loader2 className="size-3.5 animate-spin" />}
        Envoyer l&apos;avis
      </Button>
    </div>
  );
}
