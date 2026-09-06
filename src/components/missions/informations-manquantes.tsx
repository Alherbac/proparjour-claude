"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { mettreAJourInformationsMission } from "@/app/actions/missions";

type Champ = "modalites_acces" | "contact_sur_place" | "consignes_particulieres";

const LABELS: Record<Champ, string> = {
  modalites_acces: "Adresse exacte et modalités d'accès",
  contact_sur_place: "Contact sur place le jour de la mission",
  consignes_particulieres: "Tenue ou consignes particulières",
};

const PLACEHOLDERS: Record<Champ, string> = {
  modalites_acces: "Ex. Entrée livraison, code B1234, 3ᵉ étage",
  contact_sur_place: "Ex. Nom, téléphone de la personne à contacter",
  consignes_particulieres: "Ex. Tenue sombre, badge à l'accueil",
};

/**
 * Dossier design, "Détail mission" — carte "Informations manquantes"
 * (migration 0042). N'affiche que les champs réellement vides ; la
 * carte disparaît une fois les trois renseignés, comme la référence
 * ("nécessaires avant la validation").
 */
export function InformationsManquantes({
  missionId,
  valeurs,
}: {
  missionId: string;
  valeurs: Record<Champ, string | null>;
}) {
  const [etat, setEtat] = useState(valeurs);
  const [ouvert, setOuvert] = useState<Champ | null>(null);

  const manquants = (Object.keys(LABELS) as Champ[]).filter((c) => !etat[c]?.trim());
  if (manquants.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-background p-5">
      <h2 className="mb-1 font-heading text-base font-semibold text-foreground">Informations manquantes</h2>
      <p className="mb-4 text-xs text-muted-foreground">Nécessaires avant la validation de la mission.</p>
      <div className="grid gap-2.5">
        {manquants.map((champ) =>
          ouvert === champ ? (
            <LigneEdition
              key={champ}
              missionId={missionId}
              champ={champ}
              onAnnule={() => setOuvert(null)}
              onEnregistre={(valeur) => {
                setEtat((prev) => ({ ...prev, [champ]: valeur }));
                setOuvert(null);
              }}
            />
          ) : (
            <button
              key={champ}
              type="button"
              onClick={() => setOuvert(champ)}
              className="flex items-center gap-3 rounded-xl border border-ppj-red-border bg-ppj-red-bg p-3.5 text-left transition-colors hover:bg-ppj-red-border/40"
            >
              <span className="size-[18px] shrink-0 rounded-full border-[1.5px] border-primary" />
              <span className="min-w-0 flex-1 text-sm text-ppj-red-text">{LABELS[champ]}</span>
              <span className="shrink-0 text-sm font-semibold text-primary">Compléter</span>
            </button>
          ),
        )}
      </div>
    </div>
  );
}

function LigneEdition({
  missionId,
  champ,
  onAnnule,
  onEnregistre,
}: {
  missionId: string;
  champ: Champ;
  onAnnule: () => void;
  onEnregistre: (valeur: string) => void;
}) {
  const [valeur, setValeur] = useState("");
  const [isPending, startTransition] = useTransition();

  function enregistrer() {
    if (!valeur.trim()) return;
    startTransition(async () => {
      const result = await mettreAJourInformationsMission(missionId, champ, valeur);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      onEnregistre(valeur.trim());
    });
  }

  return (
    <div className="rounded-xl border border-primary/25 bg-primary/[0.06] p-3.5">
      <p className="mb-2 text-sm font-medium text-foreground">{LABELS[champ]}</p>
      <input
        autoFocus
        value={valeur}
        onChange={(e) => setValeur(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") enregistrer();
        }}
        placeholder={PLACEHOLDERS[champ]}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
      />
      <div className="mt-2.5 flex items-center gap-2">
        <button
          type="button"
          onClick={enregistrer}
          disabled={isPending || !valeur.trim()}
          className="rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
        >
          Enregistrer
        </button>
        <button type="button" onClick={onAnnule} className="text-xs text-muted-foreground hover:text-foreground">
          Annuler
        </button>
      </div>
    </div>
  );
}
