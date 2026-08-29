"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, Check, X, Sparkles, Send, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/onboarding/form-field";
import { AdresseAutocomplete } from "@/components/adresse-autocomplete";
import { METIERS } from "@/config/metiers";
import type { LigneReservation } from "@/app/actions/commande";
import { PaiementDirect } from "@/components/panier/paiement-direct";
import { verifierEquipePourNouvelleDate, type VerificationLigne, type RemplacantPropose } from "@/app/actions/refaire-mission";
import { cn } from "@/lib/utils";
import type { MissionPourRefaire } from "@/lib/refaire-mission";

type LigneEtat = {
  prestataireId: string;
  prenom: string | null;
  photoUrl: string | null;
  ville: string;
  metier: MissionPourRefaire["lignes"][number]["metier"];
  heureDebut: string;
  heureFin: string;
  tarifHoraire: number;
  verification?: VerificationLigne;
};

export function RefaireMissionForm({ mission }: { mission: MissionPourRefaire }) {
  const [date, setDate] = useState("");
  const [adresse, setAdresse] = useState(mission.lieu);
  const [isPending, startTransition] = useTransition();
  const [verifie, setVerifie] = useState(false);
  const [lignesAPayer, setLignesAPayer] = useState<LigneReservation[] | null>(null);
  const [lignes, setLignes] = useState<LigneEtat[]>(
    mission.lignes.map((l) => ({
      prestataireId: l.prestataireId,
      prenom: l.prenom,
      photoUrl: l.photoUrl,
      ville: l.ville ?? adresse,
      metier: l.metier,
      heureDebut: l.heureDebut,
      heureFin: l.heureFin,
      tarifHoraire: l.tarifHoraireEstime,
    })),
  );

  function retirerLigne(prestataireId: string) {
    setLignes((prev) => prev.filter((l) => l.prestataireId !== prestataireId));
  }

  function remplacer(prestataireId: string, remplacant: RemplacantPropose) {
    setLignes((prev) =>
      prev.map((l) =>
        l.prestataireId === prestataireId
          ? {
              ...l,
              prestataireId: remplacant.prestataireId,
              prenom: remplacant.prenom,
              photoUrl: remplacant.photoUrl,
              ville: remplacant.ville,
              tarifHoraire:
                remplacant.tarifType === "horaire" ? remplacant.tarifMontant : Math.round((remplacant.tarifMontant / 8) * 100) / 100,
              verification: undefined,
            }
          : l,
      ),
    );
  }

  function verifierDisponibilite() {
    if (!date) {
      toast.error("Choisissez une date.");
      return;
    }
    startTransition(async () => {
      const resultat = await verifierEquipePourNouvelleDate(
        lignes.map((l) => ({ prestataireId: l.prestataireId, metier: l.metier })),
        adresse,
        date,
        lignes[0]?.heureDebut ?? "09:00",
        lignes[0]?.heureFin ?? "17:00",
      );
      const parId = new Map(resultat.map((r) => [r.prestataireId, r]));
      setLignes((prev) => prev.map((l) => ({ ...l, verification: parId.get(l.prestataireId) })));
      setVerifie(true);
    });
  }

  function confirmerEtPreparerPaiement() {
    if (!date || lignes.length === 0) return;
    const indisponiblesNonRemplaces = lignes.some((l) => l.verification && !l.verification.disponible);
    if (indisponiblesNonRemplaces) {
      toast.error("Remplacez ou retirez les membres indisponibles avant de continuer.");
      return;
    }
    setLignesAPayer(
      lignes.map((ligne) => ({
        prestataireId: ligne.prestataireId,
        prenom: ligne.prenom ?? "Prestataire",
        metier: ligne.metier,
        tarifMontant: ligne.tarifHoraire,
        tarifType: "horaire",
        heureDebut: ligne.heureDebut,
        heureFin: ligne.heureFin,
        photoUrl: ligne.photoUrl,
        date,
        adresse,
        description: mission.description ?? "",
        selectionnee: true,
      })),
    );
  }

  if (lignesAPayer) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-secondary/30 p-5">
          <p className="font-medium text-foreground">{new Date(`${date}T00:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</p>
          <p className="mt-1 text-sm text-muted-foreground">{adresse}</p>
          <p className="mt-3 text-sm text-muted-foreground">
            {lignesAPayer.length} professionnel{lignesAPayer.length > 1 ? "s" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setLignesAPayer(null)}
          className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          ← Modifier
        </button>
        <PaiementDirect lignes={lignesAPayer} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-secondary/30 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Nouvelle date" htmlFor="date">
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </FormField>
          <FormField label="Adresse" htmlFor="adresse">
            <AdresseAutocomplete id="adresse" value={adresse} onChange={setAdresse} />
          </FormField>
        </div>
        <Button type="button" variant="outline" className="mt-3 rounded-full" disabled={isPending} onClick={verifierDisponibilite}>
          {isPending ? "Vérification..." : "Vérifier la disponibilité de l'équipe"}
        </Button>
      </div>

      <div className="space-y-3">
        {lignes.map((ligne) => {
          const metier = METIERS.find((m) => m.id === ligne.metier);
          const dispo = ligne.verification?.disponible;
          return (
            <div key={ligne.prestataireId} className="rounded-2xl border border-border bg-background p-4">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-semibold text-foreground/70",
                    metier?.accent.gradient,
                  )}
                >
                  {(ligne.prenom ?? "P").charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{ligne.prenom ?? "Prestataire"}</p>
                  <p className="text-sm text-muted-foreground">{metier?.label}</p>
                </div>
                <label className="flex items-center gap-1.5 text-sm text-foreground">
                  <input
                    type="number"
                    min={0}
                    step="0.5"
                    value={ligne.tarifHoraire}
                    onChange={(e) =>
                      setLignes((prev) =>
                        prev.map((l) => (l.prestataireId === ligne.prestataireId ? { ...l, tarifHoraire: Number(e.target.value) || 0 } : l)),
                      )
                    }
                    className="w-20 rounded-lg border border-border bg-background px-2 py-1 text-sm"
                  />
                  €/h
                </label>
                <button
                  type="button"
                  onClick={() => retirerLigne(ligne.prestataireId)}
                  aria-label="Retirer"
                  className="text-muted-foreground transition-colors hover:text-destructive"
                >
                  <X className="size-4" />
                </button>
              </div>

              {verifie && (
                <div className="mt-3 border-t border-border pt-3">
                  {dispo ? (
                    <p className="flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400">
                      <Check className="size-4" />
                      Disponible
                    </p>
                  ) : (
                    <div>
                      <p className="flex items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="size-4" />
                        {`${ligne.prenom ?? "Ce professionnel"} n'est pas disponible cette fois.`}
                      </p>
                      {ligne.verification && ligne.verification.remplacements.length > 0 ? (
                        <div className="mt-2 space-y-2">
                          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                            <Sparkles className="size-3.5" />
                            Nous avons trouvé des professionnels similaires :
                          </p>
                          {ligne.verification.remplacements.map((r) => (
                            <div
                              key={r.prestataireId}
                              className="flex items-center justify-between gap-2 rounded-xl border border-border bg-secondary/30 px-3 py-2"
                            >
                              <span className="text-sm text-foreground">
                                {r.prenom ?? "Prestataire"} — {r.score}% compatible
                              </span>
                              <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => remplacer(ligne.prestataireId, r)}>
                                Remplacer
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-1 text-xs text-muted-foreground">Aucun remplaçant compatible trouvé pour cette date.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {lignes.length === 0 && (
          <p className="rounded-2xl border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
            Toute l&apos;équipe a été retirée — ajoutez des professionnels depuis le catalogue.
          </p>
        )}
      </div>

      <Button type="button" className="w-full rounded-full" disabled={!date || lignes.length === 0} onClick={confirmerEtPreparerPaiement}>
        <Send className="size-4" />
        Continuer vers le paiement
      </Button>

      <Link
        href={`/tableau-de-bord/serie-recurrente/nouvelle?missionId=${mission.missionId}`}
        className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground underline underline-offset-2 hover:text-primary"
      >
        <Repeat className="size-3.5" />
        Ce besoin revient régulièrement ? Créer une série
      </Link>
    </div>
  );
}
