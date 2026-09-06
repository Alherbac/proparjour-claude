"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { AlertTriangle, Check, ChevronLeft, Plus, Repeat, Send, Sparkles, X } from "lucide-react";
import { DashButton } from "@/app/client/_components/button";
import { Vignette } from "@/app/client/_components/vignette";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChipMultiSelect } from "@/components/onboarding/chip-multi-select";
import { AdresseAutocomplete } from "@/components/adresse-autocomplete";
import { METIERS } from "@/config/metiers";
import { JOURS_SEMAINE, type JourSemaine } from "@/config/jours-semaine";
import { calculerOccurrences, FREQUENCES, type Frequence } from "@/lib/recurrence";
import { heuresEntre } from "@/lib/duree";
import type { LigneReservation } from "@/app/actions/commande";
import { PaiementDirect } from "@/components/panier/paiement-direct";
import { memoriserSerieEnAttente } from "@/lib/serie-en-attente";
import {
  creerSerie,
  verifierDisponibiliteSerie,
  type RemplacantPropose,
  type VerificationSousBesoin,
} from "@/app/actions/series";
import { descriptionSerie } from "@/lib/serie-description";
import type { MetierType } from "@/lib/supabase/database.types";

const champLabel = "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6660]";
const champInput =
  "w-full rounded-[10px] border border-[#DDD8D1] bg-white px-3 py-2 text-[13px] text-[#1A1917] outline-none transition-colors focus:border-[#1A1917] placeholder:text-[#98938B]";
const adresseInput =
  "h-auto rounded-[10px] border-[#DDD8D1] bg-white pl-8 pr-3 py-2 text-[13px] text-[#1A1917] placeholder:text-[#98938B] focus-visible:ring-0 focus-visible:border-[#1A1917]";
const selectTrigger =
  "flex w-full items-center justify-between gap-1.5 rounded-[10px] border border-[#DDD8D1] bg-white px-3 py-2 text-[13px] text-[#1A1917] outline-none transition-colors data-placeholder:text-[#98938B] disabled:cursor-not-allowed disabled:opacity-50";
const selectContent = "rounded-[10px] border border-[#DDD8D1] bg-white text-[#1A1917] shadow-md ring-0";
const selectItem = "rounded-[8px] py-1.5 pr-8 pl-2.5 text-[13px] text-[#1A1917] focus:bg-[#F6F4F0] focus:text-[#1A1917]";
const lienRetour = "flex items-center gap-1.5 text-[13px] text-[#6B6660] transition-colors hover:text-[#1A1917]";

type Candidat = {
  prestataireId: string;
  prenom: string | null;
  metier: MetierType | null;
  ville: string | null;
  photoUrl: string | null;
  nbMissions: number;
};

type PrefillSousBesoin = {
  prestataireId: string;
  prenom: string | null;
  photoUrl: string | null;
  metier: MetierType;
  heureDebut: string;
  heureFin: string;
  tarifHoraire: number;
};

type SousBesoinLigne = {
  cle: string;
  metier: MetierType | "";
  prestataireId: string;
  prenom: string | null;
  photoUrl: string | null;
  heureDebut: string;
  heureFin: string;
  tarifHoraire: number;
};

let compteurCle = 0;
function nouvelleCle() {
  compteurCle += 1;
  return `sb-${compteurCle}`;
}

function ligneVide(prefill?: PrefillSousBesoin): SousBesoinLigne {
  return {
    cle: nouvelleCle(),
    metier: prefill?.metier ?? "",
    prestataireId: prefill?.prestataireId ?? "",
    prenom: prefill?.prenom ?? null,
    photoUrl: prefill?.photoUrl ?? null,
    heureDebut: prefill?.heureDebut ?? "09:00",
    heureFin: prefill?.heureFin ?? "17:00",
    tarifHoraire: prefill?.tarifHoraire ?? 15,
  };
}

type Etape = "formulaire" | "apercu" | "confirmation";

type ResolutionCle = `${number}|${string}`;

export function CreerSerieForm({
  candidats,
  prefill,
}: {
  candidats: Candidat[];
  prefill: { lieu: string; titre: string; sousBesoins: PrefillSousBesoin[] } | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [etape, setEtape] = useState<Etape>("formulaire");
  const [lignesAPayer, setLignesAPayer] = useState<LigneReservation[] | null>(null);
  const [serieIdAPayer, setSerieIdAPayer] = useState<string | null>(null);

  const [titre, setTitre] = useState(prefill?.titre.trim() || "");
  const [lieu, setLieu] = useState(prefill?.lieu ?? "");
  const [description, setDescription] = useState("");
  const [frequence, setFrequence] = useState<Frequence>("hebdomadaire");
  const [joursSemaine, setJoursSemaine] = useState<JourSemaine[]>([]);
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [sousBesoins, setSousBesoins] = useState<SousBesoinLigne[]>(
    prefill && prefill.sousBesoins.length > 0 ? prefill.sousBesoins.map((sb) => ligneVide(sb)) : [ligneVide()],
  );

  const [dates, setDates] = useState<string[]>([]);
  const [tronque, setTronque] = useState(false);
  const [verification, setVerification] = useState<VerificationSousBesoin[] | null>(null);
  const [remplacements, setRemplacements] = useState<Map<ResolutionCle, RemplacantPropose>>(new Map());
  const [exclusions, setExclusions] = useState<Set<ResolutionCle>>(new Set());

  const candidatsParMetier = useMemo(() => {
    const map = new Map<MetierType, Candidat[]>();
    for (const c of candidats) {
      if (!c.metier) continue;
      const liste = map.get(c.metier) ?? [];
      liste.push(c);
      map.set(c.metier, liste);
    }
    return map;
  }, [candidats]);

  function mettreAJourLigne(cle: string, patch: Partial<SousBesoinLigne>) {
    setSousBesoins((prev) => prev.map((l) => (l.cle === cle ? { ...l, ...patch } : l)));
  }

  function choisirMetier(cle: string, metier: MetierType) {
    mettreAJourLigne(cle, { metier, prestataireId: "", prenom: null, photoUrl: null });
  }

  function choisirPrestataire(cle: string, prestataireId: string) {
    const ligne = sousBesoins.find((l) => l.cle === cle);
    const candidat = ligne?.metier ? candidatsParMetier.get(ligne.metier)?.find((c) => c.prestataireId === prestataireId) : undefined;
    mettreAJourLigne(cle, {
      prestataireId,
      prenom: candidat?.prenom ?? null,
      photoUrl: candidat?.photoUrl ?? null,
    });
  }

  function retirerLigne(cle: string) {
    setSousBesoins((prev) => prev.filter((l) => l.cle !== cle));
  }

  const sousBesoinsValides = sousBesoins.filter(
    (l) => l.metier && l.prestataireId && l.heureDebut && l.heureFin && l.heureDebut !== l.heureFin && l.tarifHoraire > 0,
  );

  function passerAlApercu() {
    if (!titre.trim() || !lieu.trim()) {
      toast.error("Indiquez un titre et un lieu.");
      return;
    }
    if (sousBesoinsValides.length === 0) {
      toast.error("Ajoutez au moins un poste complet (métier, professionnel, horaires, tarif).");
      return;
    }
    const resultat = calculerOccurrences({ frequence, joursSemaine, dateDebut, dateFin });
    if ("erreur" in resultat) {
      toast.error(resultat.erreur);
      return;
    }
    setDates(resultat.dates);
    setTronque(resultat.tronque);
    setVerification(null);
    setRemplacements(new Map());
    setExclusions(new Set());
    setEtape("apercu");
  }

  function verifierDisponibilite() {
    startTransition(async () => {
      const resultat = await verifierDisponibiliteSerie(
        sousBesoinsValides.map((l) => ({
          prestataireId: l.prestataireId,
          metier: l.metier as MetierType,
          heureDebut: l.heureDebut,
          heureFin: l.heureFin,
        })),
        lieu,
        dates,
      );
      setVerification(resultat);
    });
  }

  function cleResolution(sbIndex: number, date: string): ResolutionCle {
    return `${sbIndex}|${date}`;
  }

  function remplacerOccurrence(sbIndex: number, date: string, remplacant: RemplacantPropose) {
    setRemplacements((prev) => new Map(prev).set(cleResolution(sbIndex, date), remplacant));
    setExclusions((prev) => {
      const next = new Set(prev);
      next.delete(cleResolution(sbIndex, date));
      return next;
    });
  }

  function exclureOccurrence(sbIndex: number, date: string) {
    setExclusions((prev) => new Set(prev).add(cleResolution(sbIndex, date)));
    setRemplacements((prev) => {
      const next = new Map(prev);
      next.delete(cleResolution(sbIndex, date));
      return next;
    });
  }

  const conflitsNonResolus = (verification ?? []).some((sb, sbIndex) =>
    sb.occurrences.some(
      (occ) =>
        !occ.disponible &&
        !remplacements.has(cleResolution(sbIndex, occ.date)) &&
        !exclusions.has(cleResolution(sbIndex, occ.date)),
    ),
  );

  const totalEstime = useMemo(() => {
    if (!verification) return 0;
    let total = 0;
    verification.forEach((sb, sbIndex) => {
      const ligne = sousBesoinsValides[sbIndex];
      if (!ligne) return;
      for (const occ of sb.occurrences) {
        const cle = cleResolution(sbIndex, occ.date);
        if (exclusions.has(cle)) continue;
        const remplacant = remplacements.get(cle);
        const tarif = remplacant
          ? remplacant.tarifType === "horaire"
            ? remplacant.tarifMontant
            : Math.round((remplacant.tarifMontant / 8) * 100) / 100
          : ligne.tarifHoraire;
        total += tarif * heuresEntre(ligne.heureDebut, ligne.heureFin);
      }
    });
    return Math.round(total * 100) / 100;
  }, [verification, remplacements, exclusions, sousBesoinsValides]);

  function confirmerSerie() {
    if (!verification) return;
    startTransition(async () => {
      const resultat = await creerSerie({
        titre: titre.trim(),
        lieu: lieu.trim(),
        description: description.trim() || undefined,
        frequence,
        joursSemaine,
        dateDebut,
        dateFin,
        sousBesoins: sousBesoinsValides.map((l) => ({
          metier: l.metier as MetierType,
          prestataireId: l.prestataireId,
          heureDebut: l.heureDebut,
          heureFin: l.heureFin,
          tarifHoraire: l.tarifHoraire,
        })),
      });
      if (!resultat.success) {
        toast.error(resultat.error);
        return;
      }

      const desc = descriptionSerie(titre.trim());
      const construites: LigneReservation[] = [];
      verification.forEach((sb, sbIndex) => {
        const ligne = sousBesoinsValides[sbIndex];
        if (!ligne) return;
        for (const occ of sb.occurrences) {
          const cle = cleResolution(sbIndex, occ.date);
          if (exclusions.has(cle)) continue;
          const remplacant = remplacements.get(cle);
          construites.push({
            prestataireId: remplacant?.prestataireId ?? ligne.prestataireId,
            prenom: remplacant?.prenom ?? ligne.prenom ?? "Professionnel",
            metier: ligne.metier as MetierType,
            tarifMontant: remplacant
              ? remplacant.tarifType === "horaire"
                ? remplacant.tarifMontant
                : Math.round((remplacant.tarifMontant / 8) * 100) / 100
              : ligne.tarifHoraire,
            tarifType: "horaire",
            heureDebut: ligne.heureDebut,
            heureFin: ligne.heureFin,
            photoUrl: remplacant?.photoUrl ?? ligne.photoUrl,
            date: occ.date,
            adresse: lieu.trim(),
            description: desc,
            selectionnee: true,
          });
        }
      });

      // Mémorisé avant le paiement (comme avant) : une fois le paiement
      // confirmé, CheckoutForm (réutilisé tel quel par PaiementDirect)
      // détecte ce marqueur et rattache les missions créées à la série
      // plutôt que de rediriger vers une page de mission générique.
      memoriserSerieEnAttente(resultat.data.serieId);
      setSerieIdAPayer(resultat.data.serieId);
      setLignesAPayer(construites);
    });
  }

  if (candidats.length === 0) {
    return (
      <div className="rounded-[18px] border border-[#EAE6E0] bg-[#F6F4F0] p-6 text-center">
        <p className="text-[13px] text-[#1A1917]">
          Vous n&apos;avez pas encore de professionnel habituel. Les missions récurrentes s&apos;appuient sur des personnes avec
          qui vous avez déjà travaillé — retrouvez cette fonctionnalité après une première mission réussie.
        </p>
      </div>
    );
  }

  if (etape === "formulaire") {
    return (
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="titre" className={champLabel}>
              Titre de la série
            </label>
            <input id="titre" value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Ex. Sécurité boutique Paris 11" className={champInput} />
          </div>
          <div>
            <label htmlFor="lieu" className={champLabel}>
              Lieu
            </label>
            <AdresseAutocomplete id="lieu" value={lieu} onChange={setLieu} className={adresseInput} />
          </div>
        </div>
        <div>
          <label htmlFor="description" className={champLabel}>
            Description (optionnel)
          </label>
          <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={champInput} />
        </div>

        <div className="rounded-[18px] border border-[#EAE6E0] bg-white p-5">
          <h2 className="text-[15px] font-bold text-[#1A1917]">Fréquence et période</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="frequence" className={champLabel}>
                Fréquence
              </label>
              <Select items={FREQUENCES} value={frequence} onValueChange={(v) => setFrequence(v as Frequence)}>
                <SelectTrigger id="frequence" className={selectTrigger}>
                  <SelectValue placeholder="Choisir" />
                </SelectTrigger>
                <SelectContent className={selectContent}>
                  {FREQUENCES.map((f) => (
                    <SelectItem key={f.value} value={f.value} className={selectItem}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {frequence !== "mensuelle" && (
              <div>
                <label className={champLabel}>Jours de la semaine</label>
                <ChipMultiSelect options={JOURS_SEMAINE} value={joursSemaine} onChange={(v) => setJoursSemaine(v as JourSemaine[])} />
              </div>
            )}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="dateDebut" className={champLabel}>
                Début
              </label>
              <input id="dateDebut" type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} className={champInput} />
            </div>
            <div>
              <label htmlFor="dateFin" className={champLabel}>
                Fin
              </label>
              <input id="dateFin" type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} className={champInput} />
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          <h2 className="text-[15px] font-bold text-[#1A1917]">Postes de la série</h2>
          {sousBesoins.map((ligne) => {
            const optionsPrestataires = ligne.metier ? (candidatsParMetier.get(ligne.metier) ?? []) : [];
            const itemsMetiers = METIERS.map((m) => ({ value: m.id, label: m.label }));
            const itemsPrestataires = optionsPrestataires.map((c) => ({
              value: c.prestataireId,
              label: c.prenom ?? "Professionnel",
            }));
            return (
              <div key={ligne.cle} className="rounded-[14px] border border-[#EAE6E0] bg-white p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor={`metier-${ligne.cle}`} className={champLabel}>
                      Métier
                    </label>
                    <Select
                      items={itemsMetiers}
                      value={ligne.metier}
                      onValueChange={(v) => v && choisirMetier(ligne.cle, v as MetierType)}
                    >
                      <SelectTrigger id={`metier-${ligne.cle}`} className={selectTrigger}>
                        <SelectValue placeholder="Choisir un métier" />
                      </SelectTrigger>
                      <SelectContent className={selectContent}>
                        {METIERS.map((m) => (
                          <SelectItem key={m.id} value={m.id} className={selectItem}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label htmlFor={`prestataire-${ligne.cle}`} className={champLabel}>
                      Professionnel habituel
                    </label>
                    <Select
                      items={itemsPrestataires}
                      value={ligne.prestataireId}
                      onValueChange={(v) => v && choisirPrestataire(ligne.cle, v)}
                    >
                      <SelectTrigger id={`prestataire-${ligne.cle}`} className={selectTrigger} disabled={!ligne.metier}>
                        <SelectValue placeholder={ligne.metier ? "Choisir" : "Choisissez un métier d'abord"} />
                      </SelectTrigger>
                      <SelectContent className={selectContent}>
                        {optionsPrestataires.map((c) => (
                          <SelectItem key={c.prestataireId} value={c.prestataireId} className={selectItem}>
                            {c.prenom ?? "Professionnel"} {c.nbMissions > 0 ? `— ${c.nbMissions} mission${c.nbMissions > 1 ? "s" : ""}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div>
                    <label htmlFor={`hd-${ligne.cle}`} className={champLabel}>
                      Début
                    </label>
                    <input
                      id={`hd-${ligne.cle}`}
                      type="time"
                      value={ligne.heureDebut}
                      onChange={(e) => mettreAJourLigne(ligne.cle, { heureDebut: e.target.value })}
                      className={champInput}
                    />
                  </div>
                  <div>
                    <label htmlFor={`hf-${ligne.cle}`} className={champLabel}>
                      Fin
                    </label>
                    <input
                      id={`hf-${ligne.cle}`}
                      type="time"
                      value={ligne.heureFin}
                      onChange={(e) => mettreAJourLigne(ligne.cle, { heureFin: e.target.value })}
                      className={champInput}
                    />
                  </div>
                  <div>
                    <label htmlFor={`tarif-${ligne.cle}`} className={champLabel}>
                      Tarif €/h
                    </label>
                    <input
                      id={`tarif-${ligne.cle}`}
                      type="number"
                      min={0}
                      step="0.5"
                      value={ligne.tarifHoraire}
                      onChange={(e) => mettreAJourLigne(ligne.cle, { tarifHoraire: Number(e.target.value) || 0 })}
                      className={champInput}
                    />
                  </div>
                </div>
                {sousBesoins.length > 1 && (
                  <button
                    type="button"
                    onClick={() => retirerLigne(ligne.cle)}
                    className="mt-3 flex items-center gap-1.5 text-[13px] text-[#6B6660] transition-colors hover:text-[#8E2A26]"
                  >
                    <X className="size-3.5" />
                    Retirer ce poste
                  </button>
                )}
              </div>
            );
          })}
          <DashButton type="button" variant="secondaire" onClick={() => setSousBesoins((prev) => [...prev, ligneVide()])}>
            <Plus className="size-4" />
            Ajouter un poste
          </DashButton>
        </div>

        <DashButton type="button" variant="plein" className="w-full" onClick={passerAlApercu}>
          Voir l&apos;aperçu des occurrences
        </DashButton>
      </div>
    );
  }

  if (etape === "apercu") {
    return (
      <div className="space-y-5">
        <button type="button" onClick={() => setEtape("formulaire")} className={lienRetour}>
          <ChevronLeft className="size-4" />
          Modifier
        </button>

        <div className="rounded-[18px] border border-[#EAE6E0] bg-white p-5">
          <p className="text-[19px] font-bold text-[#1A1917]">
            {dates.length} occurrence{dates.length > 1 ? "s" : ""} calculée{dates.length > 1 ? "s" : ""}
          </p>
          {tronque && (
            <p className="mt-1 text-[12px]" style={{ color: "#96662A" }}>
              Seules les {dates.length} premières occurrences sont proposées — au-delà, créez une nouvelle série pour la suite.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {dates.map((d) => (
              <span key={d} className="rounded-[999px] border border-[#DDD8D1] bg-white px-3 py-1 text-[12px] text-[#1A1917]">
                {new Date(`${d}T00:00:00`).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
              </span>
            ))}
          </div>
        </div>

        {!verification ? (
          <DashButton type="button" variant="plein" className="w-full" disabled={isPending} onClick={verifierDisponibilite}>
            {isPending ? "Vérification..." : "Vérifier la disponibilité de mes professionnels"}
          </DashButton>
        ) : (
          <div className="space-y-3.5">
            {verification.map((sb, sbIndex) => {
              const ligne = sousBesoinsValides[sbIndex];
              const metier = METIERS.find((m) => m.id === sb.metier);
              const nbOk = sb.occurrences.filter(
                (o) => o.disponible || remplacements.has(cleResolution(sbIndex, o.date)) || exclusions.has(cleResolution(sbIndex, o.date)),
              ).length;
              return (
                <div key={ligne?.cle ?? sbIndex} className="rounded-[14px] border border-[#EAE6E0] bg-white p-4">
                  <div className="flex items-center gap-3">
                    <Vignette photoUrl={ligne?.photoUrl ?? null} nom={ligne?.prenom ?? "P"} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold text-[#1A1917]">{ligne?.prenom ?? "Professionnel"}</p>
                      <p className="text-[13px] text-[#6B6660]">
                        {metier?.label} — {nbOk}/{sb.occurrences.length} occurrences prêtes
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2 border-t border-[#EAE6E0] pt-3">
                    {sb.occurrences.map((occ) => {
                      const cle = cleResolution(sbIndex, occ.date);
                      const remplacant = remplacements.get(cle);
                      const exclue = exclusions.has(cle);
                      const dateLabel = new Date(`${occ.date}T00:00:00`).toLocaleDateString("fr-FR", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      });
                      if (occ.disponible) {
                        return (
                          <p key={occ.date} className="flex items-center gap-1.5 text-[13px] font-medium" style={{ color: "#2A8355" }}>
                            <Check className="size-4" />
                            {dateLabel} — disponible
                          </p>
                        );
                      }
                      return (
                        <div key={occ.date} className="rounded-[12px] bg-[#F6F4F0] p-3">
                          <p className="flex items-center gap-1.5 text-[13px] font-medium" style={{ color: "#96662A" }}>
                            <AlertTriangle className="size-4" />
                            {`${dateLabel} — ${ligne?.prenom ?? "ce professionnel"} n'est pas disponible`}
                          </p>
                          {exclue ? (
                            <p className="mt-1.5 text-[12px] text-[#6B6660]">Cette date sera retirée de la série.</p>
                          ) : remplacant ? (
                            <p className="mt-1.5 text-[12px] text-[#1A1917]">Remplacé par {remplacant.prenom ?? "un professionnel"} pour cette date.</p>
                          ) : (
                            <div className="mt-2 space-y-1.5">
                              {occ.remplacements.length > 0 ? (
                                <>
                                  <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-[#6B6660]">
                                    <Sparkles className="size-3.5" />
                                    Remplaçants disponibles :
                                  </p>
                                  {occ.remplacements.map((r) => (
                                    <div key={r.prestataireId} className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-[#EAE6E0] bg-white px-2.5 py-1.5">
                                      <span className="text-[12.5px] text-[#1A1917]">
                                        {r.prenom ?? "Professionnel"} — {r.score}%
                                      </span>
                                      <DashButton type="button" variant="secondaire" onClick={() => remplacerOccurrence(sbIndex, occ.date, r)}>
                                        Remplacer
                                      </DashButton>
                                    </div>
                                  ))}
                                </>
                              ) : (
                                <p className="text-[12px] text-[#6B6660]">Aucun remplaçant disponible pour cette date.</p>
                              )}
                              <button
                                type="button"
                                onClick={() => exclureOccurrence(sbIndex, occ.date)}
                                className="text-[12px] text-[#6B6660] underline underline-offset-2 hover:text-[#8E2A26]"
                              >
                                Retirer cette date de la série
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {conflitsNonResolus && (
              <p className="text-[13px] font-medium" style={{ color: "#96662A" }}>
                Résolvez (remplacez ou retirez) chaque date en conflit avant de continuer.
              </p>
            )}
            <DashButton type="button" variant="plein" className="w-full" disabled={conflitsNonResolus} onClick={() => setEtape("confirmation")}>
              Continuer vers la confirmation
            </DashButton>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <button type="button" onClick={() => setEtape("apercu")} className={lienRetour}>
        <ChevronLeft className="size-4" />
        Retour
      </button>

      <div className="rounded-[18px] p-6 text-white" style={{ backgroundColor: "#1A1917" }}>
        <div className="flex items-center gap-2">
          <Repeat className="size-5" />
          <p className="text-[19px] font-bold">{titre}</p>
        </div>
        <p className="mt-2 text-[13px] text-white/75">{lieu}</p>
        <p className="mt-1 text-[13px] text-white/75">{FREQUENCES.find((f) => f.value === frequence)?.label}</p>
      </div>

      <div className="space-y-2.5">
        {(verification ?? []).map((sb, sbIndex) => {
          const ligne = sousBesoinsValides[sbIndex];
          const metier = METIERS.find((m) => m.id === sb.metier);
          const retenues = sb.occurrences.filter((o) => !exclusions.has(cleResolution(sbIndex, o.date)));
          return (
            <div key={ligne?.cle ?? sbIndex} className="rounded-[14px] border border-[#EAE6E0] bg-white p-4">
              <p className="text-[14px] font-semibold text-[#1A1917]">
                {ligne?.prenom ?? "Professionnel"} — {metier?.label}
              </p>
              <p className="mt-0.5 text-[13px] text-[#6B6660]">
                {retenues.length} occurrence{retenues.length > 1 ? "s" : ""} confirmée{retenues.length > 1 ? "s" : ""}
              </p>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between rounded-[18px] border border-[#EAE6E0] bg-white p-5">
        <span className="text-[13px] font-semibold text-[#1A1917]">Montant total estimé</span>
        <span className="text-[24px] text-[#1A1917]" style={{ fontFamily: "var(--font-instrument-serif)" }}>
          {totalEstime} €
        </span>
      </div>

      {lignesAPayer ? (
        <PaiementDirect lignes={lignesAPayer} serieId={serieIdAPayer ?? undefined} />
      ) : (
        <DashButton type="button" variant="plein" className="w-full" disabled={isPending} onClick={confirmerSerie}>
          <Send className="size-4" />
          {isPending ? "Création..." : "Confirmer la série et payer"}
        </DashButton>
      )}
    </div>
  );
}
