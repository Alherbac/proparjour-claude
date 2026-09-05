"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/app/client/_components/badge";
import { demanderSuppressionCompte } from "@/app/client/actions";

const MOTIFS = [
  "Je n'utilise plus le service",
  "J'ai trouvé une autre solution",
  "Problème avec le service",
  "Préoccupations liées à la confidentialité",
  "Autre",
];

/**
 * "Supprimer mon compte" — dossier design §4/§5 : bordure rouge,
 * badge "Irréversible", motif obligatoire parmi une liste de
 * pastilles, bouton de confirmation désactivé (#F0EDE8/#98938B) tant
 * qu'aucun motif n'est choisi, actif (#B8130F) une fois choisi.
 */
export function SuppressionCompte() {
  const [motif, setMotif] = useState<string | null>(null);
  const [envoi, startTransition] = useTransition();
  const [resultat, setResultat] = useState<{ ok: boolean; message: string } | null>(null);

  function confirmer() {
    if (!motif) return;
    startTransition(async () => {
      const res = await demanderSuppressionCompte(motif);
      setResultat(res.success ? { ok: true, message: "Votre demande a été enregistrée." } : { ok: false, message: res.error });
    });
  }

  return (
    <div className="rounded-[18px] border p-5" style={{ borderColor: "rgba(226,29,27,.28)" }}>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-[15px] font-bold text-[#1A1917]">Supprimer mon compte</h2>
        <Badge tone="rouge">Irréversible</Badge>
      </div>
      <p className="mb-4 text-[13px] leading-relaxed text-[#6B6660]">
        Le profil disparaît de la recherche immédiatement. Les missions passées et les factures sont conservées le temps prévu par la loi.
        Une mission en cours doit d&apos;abord être terminée.
      </p>

      {resultat ? (
        <p className="text-[13px]" style={{ color: resultat.ok ? "#2A8355" : "#8E2A26" }}>
          {resultat.message}
        </p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {MOTIFS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMotif(m)}
                className="rounded-[10px] px-3 py-2 text-[12.5px] font-medium transition-colors"
                style={
                  motif === m
                    ? { backgroundColor: "#1A1917", color: "#FBFAF8" }
                    : { backgroundColor: "#FFFFFF", border: "1px solid #DDD8D1", color: "#1A1917" }
                }
              >
                {m}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={!motif || envoi}
            onClick={confirmer}
            className="min-h-[44px] rounded-[10px] px-4 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed"
            style={motif ? { backgroundColor: "#B8130F", color: "#FFFFFF" } : { backgroundColor: "#F0EDE8", color: "#98938B", cursor: "not-allowed" }}
          >
            {envoi ? "Envoi..." : "Confirmer la suppression"}
          </button>
        </>
      )}
    </div>
  );
}
