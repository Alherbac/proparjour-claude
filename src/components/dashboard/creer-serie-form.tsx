"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { AlertTriangle, Check, ChevronLeft, Plus, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "@/components/onboarding/form-field";
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
import { cn } from "@/lib/utils";

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
      <div className="rounded-2xl border border-border bg-secondary/30 p-6 text-center">
        <p className="text-sm text-foreground">
          Vous n&apos;avez pas encore de professionnel habituel. Les missions récurrentes s&apos;appuient sur des personnes avec
          qui vous avez déjà travaillé — retrouvez cette fonctionnalité après une première mission réussie.
        </p>
      </div>
    );
  }

  if (etape === "formulaire") {
    return (
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Titre de la série" htmlFor="titre">
            <Input id="titre" value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Ex. Sécurité boutique Paris 11" />
          </FormField>
          <FormField label="Lieu" htmlFor="lieu">
            <AdresseAutocomplete id="lieu" value={lieu} onChange={setLieu} />
          </FormField>
        </div>
        <FormField label="Description (optionnel)" htmlFor="description">
          <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </FormField>

        <div className="rounded-2xl border border-border bg-secondary/30 p-5">
          <h2 className="font-heading text-base font-semibold text-foreground">Fréquence et période</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <FormField label="Fréquence" htmlFor="frequence">
              <Select items={FREQUENCES} value={frequence} onValueChange={(v) => setFrequence(v as Frequence)}>
                <SelectTrigger id="frequence" className="w-full">
                  <SelectValue placeholder="Choisir" />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            {frequence !== "mensuelle" && (
              <FormField label="Jours de la semaine" htmlFor="jours">
                <ChipMultiSelect options={JOURS_SEMAINE} value={joursSemaine} onChange={(v) => setJoursSemaine(v as JourSemaine[])} />
              </FormField>
            )}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <FormField label="Début" htmlFor="dateDebut">
              <Input id="dateDebut" type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
            </FormField>
            <FormField label="Fin" htmlFor="dateFin">
              <Input id="dateFin" type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
            </FormField>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="font-heading text-base font-semibold text-foreground">Postes de la série</h2>
          {sousBesoins.map((ligne) => {
            const optionsPrestataires = ligne.metier ? (candidatsParMetier.get(ligne.metier) ?? []) : [];
            const itemsMetiers = METIERS.map((m) => ({ value: m.id, label: m.label }));
            const itemsPrestataires = optionsPrestataires.map((c) => ({
              value: c.prestataireId,
              label: c.prenom ?? "Professionnel",
            }));
            return (
              <div key={ligne.cle} className="rounded-2xl border border-border bg-background p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label="Métier" htmlFor={`metier-${ligne.cle}`}>
                    <Select
                      items={itemsMetiers}
                      value={ligne.metier}
                      onValueChange={(v) => v && choisirMetier(ligne.cle, v as MetierType)}
                    >
                      <SelectTrigger id={`metier-${ligne.cle}`} className="w-full">
                        <SelectValue placeholder="Choisir un métier" />
                      </SelectTrigger>
                      <SelectContent>
                        {METIERS.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Professionnel habituel" htmlFor={`prestataire-${ligne.cle}`}>
                    <Select
                      items={itemsPrestataires}
                      value={ligne.prestataireId}
                      onValueChange={(v) => v && choisirPrestataire(ligne.cle, v)}
                    >
                      <SelectTrigger id={`prestataire-${ligne.cle}`} className="w-full" disabled={!ligne.metier}>
                        <SelectValue placeholder={ligne.metier ? "Choisir" : "Choisissez un métier d'abord"} />
                      </SelectTrigger>
                      <SelectContent>
                        {optionsPrestataires.map((c) => (
                          <SelectItem key={c.prestataireId} value={c.prestataireId}>
                            {c.prenom ?? "Professionnel"} {c.nbMissions > 0 ? `— ${c.nbMissions} mission${c.nbMissions > 1 ? "s" : ""}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <FormField label="Début" htmlFor={`hd-${ligne.cle}`}>
                    <Input
                      id={`hd-${ligne.cle}`}
                      type="time"
                      value={ligne.heureDebut}
                      onChange={(e) => mettreAJourLigne(ligne.cle, { heureDebut: e.target.value })}
                    />
                  </FormField>
                  <FormField label="Fin" htmlFor={`hf-${ligne.cle}`}>
                    <Input
                      id={`hf-${ligne.cle}`}
                      type="time"
                      value={ligne.heureFin}
                      onChange={(e) => mettreAJourLigne(ligne.cle, { heureFin: e.target.value })}
                    />
                  </FormField>
                  <FormField label="Tarif €/h" htmlFor={`tarif-${ligne.cle}`}>
                    <Input
                      id={`tarif-${ligne.cle}`}
                      type="number"
                      min={0}
                      step="0.5"
                      value={ligne.tarifHoraire}
                      onChange={(e) => mettreAJourLigne(ligne.cle, { tarifHoraire: Number(e.target.value) || 0 })}
                    />
                  </FormField>
                </div>
                {sousBesoins.length > 1 && (
                  <button
                    type="button"
                    onClick={() => retirerLigne(ligne.cle)}
                    className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <X className="size-3.5" />
                    Retirer ce poste
                  </button>
                )}
              </div>
            );
          })}
          <Button type="button" variant="outline" className="rounded-full" onClick={() => setSousBesoins((prev) => [...prev, ligneVide()])}>
            <Plus className="size-4" />
            Ajouter un poste
          </Button>
        </div>

        <Button type="button" className="w-full rounded-full" onClick={passerAlApercu}>
          Voir l&apos;aperçu des occurrences
        </Button>
      </div>
    );
  }

  if (etape === "apercu") {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => setEtape("formulaire")}
          className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Modifier
        </button>

        <div className="rounded-2xl border border-border bg-secondary/30 p-5">
          <p className="font-heading text-lg font-semibold text-foreground">
            {dates.length} occurrence{dates.length > 1 ? "s" : ""} calculée{dates.length > 1 ? "s" : ""}
          </p>
          {tronque && (
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
              Seules les {dates.length} premières occurrences sont proposées — au-delà, créez une nouvelle série pour la suite.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {dates.map((d) => (
              <span key={d} className="rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground">
                {new Date(`${d}T00:00:00`).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
              </span>
            ))}
          </div>
        </div>

        {!verification ? (
          <Button type="button" className="w-full rounded-full" disabled={isPending} onClick={verifierDisponibilite}>
            {isPending ? "Vérification..." : "Vérifier la disponibilité de mes professionnels"}
          </Button>
        ) : (
          <div className="space-y-4">
            {verification.map((sb, sbIndex) => {
              const ligne = sousBesoinsValides[sbIndex];
              const metier = METIERS.find((m) => m.id === sb.metier);
              const nbOk = sb.occurrences.filter(
                (o) => o.disponible || remplacements.has(cleResolution(sbIndex, o.date)) || exclusions.has(cleResolution(sbIndex, o.date)),
              ).length;
              return (
                <div key={ligne?.cle ?? sbIndex} className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-semibold text-foreground/70",
                        metier?.accent.gradient,
                      )}
                    >
                      {(ligne?.prenom ?? "P").charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">{ligne?.prenom ?? "Professionnel"}</p>
                      <p className="text-sm text-muted-foreground">
                        {metier?.label} — {nbOk}/{sb.occurrences.length} occurrences prêtes
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2 border-t border-border pt-3">
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
                          <p key={occ.date} className="flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400">
                            <Check className="size-4" />
                            {dateLabel} — disponible
                          </p>
                        );
                      }
                      return (
                        <div key={occ.date} className="rounded-xl bg-secondary/30 p-3">
                          <p className="flex items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-400">
                            <AlertTriangle className="size-4" />
                            {`${dateLabel} — ${ligne?.prenom ?? "ce professionnel"} n'est pas disponible`}
                          </p>
                          {exclue ? (
                            <p className="mt-1.5 text-xs text-muted-foreground">Cette date sera retirée de la série.</p>
                          ) : remplacant ? (
                            <p className="mt-1.5 text-xs text-foreground">Remplacé par {remplacant.prenom ?? "un professionnel"} pour cette date.</p>
                          ) : (
                            <div className="mt-2 space-y-1.5">
                              {occ.remplacements.length > 0 ? (
                                <>
                                  <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                    <Sparkles className="size-3.5" />
                                    Remplaçants disponibles :
                                  </p>
                                  {occ.remplacements.map((r) => (
                                    <div key={r.prestataireId} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5">
                                      <span className="text-xs text-foreground">
                                        {r.prenom ?? "Professionnel"} — {r.score}%
                                      </span>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="rounded-full text-xs"
                                        onClick={() => remplacerOccurrence(sbIndex, occ.date, r)}
                                      >
                                        Remplacer
                                      </Button>
                                    </div>
                                  ))}
                                </>
                              ) : (
                                <p className="text-xs text-muted-foreground">Aucun remplaçant disponible pour cette date.</p>
                              )}
                              <button
                                type="button"
                                onClick={() => exclureOccurrence(sbIndex, occ.date)}
                                className="text-xs text-muted-foreground underline underline-offset-2 hover:text-destructive"
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
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                Résolvez (remplacez ou retirez) chaque date en conflit avant de continuer.
              </p>
            )}
            <Button type="button" className="w-full rounded-full" disabled={conflitsNonResolus} onClick={() => setEtape("confirmation")}>
              Continuer vers la confirmation
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => setEtape("apercu")}
        className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Retour
      </button>

      <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-primary via-primary to-red-900 p-6 text-white">
        <p className="font-heading text-xl font-semibold">{titre}</p>
        <p className="mt-1 text-sm text-white/80">{lieu}</p>
        <p className="mt-3 text-sm text-white/80">{FREQUENCES.find((f) => f.value === frequence)?.label}</p>
      </div>

      <div className="space-y-3">
        {(verification ?? []).map((sb, sbIndex) => {
          const ligne = sousBesoinsValides[sbIndex];
          const metier = METIERS.find((m) => m.id === sb.metier);
          const retenues = sb.occurrences.filter((o) => !exclusions.has(cleResolution(sbIndex, o.date)));
          return (
            <div key={ligne?.cle ?? sbIndex} className="rounded-2xl border border-border bg-background p-4">
              <p className="font-medium text-foreground">
                {ligne?.prenom ?? "Professionnel"} — {metier?.label}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {retenues.length} occurrence{retenues.length > 1 ? "s" : ""} confirmée{retenues.length > 1 ? "s" : ""}
              </p>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-border bg-secondary/30 p-4">
        <span className="text-sm font-medium text-foreground">Montant total estimé</span>
        <span className="font-heading text-xl font-semibold text-foreground">{totalEstime} €</span>
      </div>

      {lignesAPayer ? (
        <PaiementDirect lignes={lignesAPayer} serieId={serieIdAPayer ?? undefined} />
      ) : (
        <Button type="button" className="w-full rounded-full" disabled={isPending} onClick={confirmerSerie}>
          <Send className="size-4" />
          {isPending ? "Création..." : "Confirmer la série et payer"}
        </Button>
      )}
    </div>
  );
}
