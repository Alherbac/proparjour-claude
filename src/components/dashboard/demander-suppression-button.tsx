"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { demanderSuppressionCompte } from "@/app/actions/suppression-compte";

export function DemanderSuppressionButton() {
  const [ouvert, setOuvert] = useState(false);
  const [motif, setMotif] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ type: "succes" | "erreur"; texte: string } | null>(null);

  async function envoyer() {
    setEnvoi(true);
    setMessage(null);
    const result = await demanderSuppressionCompte(motif);
    setEnvoi(false);
    if (result.success) {
      setMessage({ type: "succes", texte: "Votre demande a été transmise. L'équipe ProParJour la traitera sous peu." });
      setOuvert(false);
    } else {
      setMessage({ type: "erreur", texte: result.error });
    }
  }

  if (message?.type === "succes") {
    return <p className="text-sm text-muted-foreground">{message.texte}</p>;
  }

  if (!ouvert) {
    return (
      <Button type="button" variant="outline" className="rounded-full text-destructive" onClick={() => setOuvert(true)}>
        <Trash2 className="size-4" />
        Demander la suppression de mon compte
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Cette demande sera examinée par l&apos;équipe ProParJour. Une fois traitée, votre compte et l&apos;ensemble
        de vos données seront définitivement supprimés.
      </p>
      <Textarea
        value={motif}
        onChange={(e) => setMotif(e.target.value)}
        rows={3}
        placeholder="Pourquoi souhaitez-vous supprimer votre compte ? (optionnel)"
      />
      {message?.type === "erreur" && <p className="text-sm text-destructive">{message.texte}</p>}
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" className="rounded-full" onClick={() => setOuvert(false)}>
          Annuler
        </Button>
        <Button type="button" variant="destructive" className="rounded-full" disabled={envoi} onClick={envoyer}>
          Confirmer la demande
        </Button>
      </div>
    </div>
  );
}
