"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, Check, X, Sparkles, Send, Repeat, ChevronLeft } from "lucide-react";
import { DashButton } from "@/app/client/_components/button";
import { Vignette } from "@/app/client/_components/vignette";
import { AdresseAutocomplete } from "@/components/adresse-autocomplete";
import { METIERS } from "@/config/metiers";
import type { LigneReservation } from "@/app/actions/commande";
import { PaiementDirect } from "@/components/panier/paiement-direct";
import { verifierEquipePourNouvelleDate, type VerificationLigne, type RemplacantPropose } from "@/app/actions/refaire-mission";
import type { MissionPourRefaire } from "@/lib/refaire-mission";

const champLabel = "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6660]";
const champInput =
  "w-full rounded-[10px] border border-[#DDD8D1] bg-white px-3 py-2 text-[13px] text-[#1A1917] outline-none transition-colors focus:border-[#1A1917] placeholder:text-[#98938B]";
const adresseInput =
  "h-auto rounded-[10px] border-[#DDD8D1] bg-white pl-8 pr-3 py-2 text-[13px] text-[#1A1917] placeholder:text-[#98938B] focus-visible:ring-0 focus-visible:border-[#1A1917]";
const lienRetour = "inline-flex items-center gap-1.5 text-[13px] text-[#6B6660] transition-colors hover:text-[#1A1917]";

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
      <div className="space-y-5">
        <div className="rounded-[18px] border border-[#EAE6E0] bg-white p-5">
          <p className="text-[14px] font-semibold text-[#1A1917]">
            {new Date(`${date}T00:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <p className="mt-1 text-[13px] text-[#6B6660]">{adresse}</p>
          <p className="mt-3 text-[13px] text-[#6B6660]">
            {lignesAPayer.length} professionnel{lignesAPayer.length > 1 ? "s" : ""}
          </p>
        </div>
        <button type="button" onClick={() => setLignesAPayer(null)} className={lienRetour}>
          <ChevronLeft className="size-3.5" />
          Modifier
        </button>
        <PaiementDirect lignes={lignesAPayer} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[18px] border border-[#EAE6E0] bg-white p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="date" className={champLabel}>
              Nouvelle date
            </label>
            <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={champInput} />
          </div>
          <div>
            <label htmlFor="adresse" className={champLabel}>
              Adresse
            </label>
            <AdresseAutocomplete id="adresse" value={adresse} onChange={setAdresse} className={adresseInput} />
          </div>
        </div>
        <DashButton type="button" variant="secondaire" className="mt-3.5" disabled={isPending} onClick={verifierDisponibilite}>
          {isPending ? "Vérification..." : "Vérifier la disponibilité de l'équipe"}
        </DashButton>
      </div>

      <div className="space-y-2.5">
        {lignes.map((ligne) => {
          const metier = METIERS.find((m) => m.id === ligne.metier);
          const dispo = ligne.verification?.disponible;
          return (
            <div key={ligne.prestataireId} className="rounded-[14px] border border-[#EAE6E0] bg-white p-4">
              <div className="flex items-center gap-3">
                <Vignette photoUrl={ligne.photoUrl} nom={ligne.prenom ?? "P"} />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-[#1A1917]">{ligne.prenom ?? "Prestataire"}</p>
                  <p className="text-[13px] text-[#6B6660]">{metier?.label}</p>
                </div>
                <label className="flex items-center gap-1.5 text-[13px] text-[#1A1917]">
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
                    className="w-20 rounded-[10px] border border-[#DDD8D1] bg-white px-2 py-1 text-[13px] text-[#1A1917] outline-none focus:border-[#1A1917]"
                  />
                  €/h
                </label>
                <button
                  type="button"
                  onClick={() => retirerLigne(ligne.prestataireId)}
                  aria-label="Retirer"
                  className="text-[#98938B] transition-colors hover:text-[#8E2A26]"
                >
                  <X className="size-4" />
                </button>
              </div>

              {verifie && (
                <div className="mt-3 border-t border-[#EAE6E0] pt-3">
                  {dispo ? (
                    <p className="flex items-center gap-1.5 text-[13px] font-medium" style={{ color: "#2A8355" }}>
                      <Check className="size-4" />
                      Disponible
                    </p>
                  ) : (
                    <div>
                      <p className="flex items-center gap-1.5 text-[13px] font-medium" style={{ color: "#96662A" }}>
                        <AlertTriangle className="size-4" />
                        {`${ligne.prenom ?? "Ce professionnel"} n'est pas disponible cette fois.`}
                      </p>
                      {ligne.verification && ligne.verification.remplacements.length > 0 ? (
                        <div className="mt-2 space-y-2">
                          <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-[#6B6660]">
                            <Sparkles className="size-3.5" />
                            Nous avons trouvé des professionnels similaires :
                          </p>
                          {ligne.verification.remplacements.map((r) => (
                            <div
                              key={r.prestataireId}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-[#EAE6E0] bg-[#F6F4F0] px-3 py-2"
                            >
                              <span className="text-[13px] text-[#1A1917]">
                                {r.prenom ?? "Prestataire"} — {r.score}% compatible
                              </span>
                              <DashButton type="button" variant="secondaire" onClick={() => remplacer(ligne.prestataireId, r)}>
                                Remplacer
                              </DashButton>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-1 text-[12px] text-[#6B6660]">Aucun remplaçant compatible trouvé pour cette date.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {lignes.length === 0 && (
          <p className="rounded-[14px] border border-[#EAE6E0] bg-[#F6F4F0] p-4 text-[13px] text-[#6B6660]">
            Toute l&apos;équipe a été retirée — ajoutez des professionnels depuis le catalogue.
          </p>
        )}
      </div>

      <DashButton type="button" variant="plein" className="w-full" disabled={!date || lignes.length === 0} onClick={confirmerEtPreparerPaiement}>
        <Send className="size-4" />
        Continuer vers le paiement
      </DashButton>

      <Link
        href={`/client/series/nouvelle?missionId=${mission.missionId}`}
        className="flex items-center justify-center gap-1.5 text-[13px] font-semibold text-[#E21D1B] hover:underline"
      >
        <Repeat className="size-3.5" />
        Ce besoin revient régulièrement ? Créer une série
      </Link>
    </div>
  );
}
