"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send, Layers, MapPin, CalendarDays, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { METIERS } from "@/config/metiers";
import { publierDemandeGlobale } from "@/app/actions/offres";
import { obtenirRecommandations } from "@/app/actions/matching";
import type { ResultatMatching } from "@/lib/matching";
import { RecommandationsList } from "@/components/prestataire/recommandations-list";
import { lireDemande, effacerDemande, type DemandeEnCours, type SousBesoinEnCours } from "@/lib/besoin";

export function PublierDemandeForm() {
  const router = useRouter();
  const [demande, setDemande] = useState<DemandeEnCours | null>(null);
  const [sousBesoins, setSousBesoins] = useState<SousBesoinEnCours[]>([]);
  const [chargee, setChargee] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [recommandations, setRecommandations] = useState<Record<number, ResultatMatching>>({});
  const [chargementIndex, setChargementIndex] = useState<number | null>(null);

  useEffect(() => {
    const trouvee = lireDemande();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydratation ponctuelle depuis localStorage au montage, même pattern que publier-mission-form.tsx
    setDemande(trouvee);
    setSousBesoins(trouvee?.sousBesoins ?? []);
    setChargee(true);
  }, []);

  function modifierLigne(index: number, champ: "quantite" | "tarifHoraire", valeur: number) {
    setSousBesoins((prev) =>
      prev.map((sb, i) => (i === index ? { ...sb, [champ]: champ === "quantite" ? Math.max(1, valeur) : valeur } : sb)),
    );
  }

  function modifierChamp(index: number, champ: "ville" | "date" | "heureDebut" | "heureFin", valeur: string) {
    setSousBesoins((prev) => prev.map((sb, i) => (i === index ? { ...sb, [champ]: valeur } : sb)));
  }

  async function voirRecommandations(index: number) {
    const sb = sousBesoins[index];
    setChargementIndex(index);
    const resultat = await obtenirRecommandations({
      metier: sb.metier,
      ville: sb.ville,
      date: sb.date,
      heureDebut: sb.heureDebut,
      heureFin: sb.heureFin,
      tarifHoraire: sb.tarifHoraire ?? undefined,
      quantite: sb.quantite,
    });
    setChargementIndex(null);
    setRecommandations((prev) => ({ ...prev, [index]: resultat }));
  }

  async function publier() {
    if (!demande) return;
    for (const sb of sousBesoins) {
      if (!sb.tarifHoraire || sb.tarifHoraire <= 0) {
        toast.error("Indiquez un tarif horaire pour chaque besoin.");
        return;
      }
      if (!sb.ville.trim() || !sb.date) {
        toast.error("Indiquez une ville et une date pour chaque besoin.");
        return;
      }
    }
    setEnvoi(true);
    const result = await publierDemandeGlobale({
      titre: demande.titre,
      texteOriginal: demande.texteOriginal,
      sousBesoins: sousBesoins.map((sb) => ({
        metier: sb.metier,
        quantite: sb.quantite,
        tarifHoraire: sb.tarifHoraire ?? 0,
        ville: sb.ville,
        dateMission: sb.date,
        heureDebut: sb.heureDebut,
        heureFin: sb.heureFin,
      })),
    });
    setEnvoi(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    effacerDemande();
    toast.success(`Demande publiée — ${sousBesoins.length} besoins envoyés indépendamment.`);
    router.push("/tableau-de-bord/mes-offres");
  }

  if (!chargee) return null;

  if (!demande || sousBesoins.length < 2) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3 px-4 py-20 text-center">
        <Layers className="size-10 text-muted-foreground" />
        <h1 className="font-display-serif text-2xl text-foreground">Aucune demande à publier</h1>
        <p className="text-muted-foreground">
          Décrivez votre besoin avec plusieurs métiers depuis la recherche pour composer une demande groupée.
        </p>
        <Button render={<Link href="/prestataires" />} className="mt-2 rounded-full">
          Décrire mon besoin
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 lg:px-8 lg:py-14">
      <h1 className="font-heading text-3xl font-semibold text-foreground">{demande.titre}</h1>

      <p className="mt-3 text-sm font-medium text-foreground">
        {sousBesoins.length} besoins indépendants — chacun a sa propre ville, sa propre date et son propre horaire ;
        chacun aura son propre matching, son propre prestataire et son propre paiement.
      </p>

      <div className="mt-3 space-y-3">
        {sousBesoins.map((sb, index) => {
          const label = METIERS.find((m) => m.id === sb.metier)?.label;
          return (
            <div key={sb.metier} className="rounded-2xl border border-border bg-background p-4">
              <p className="font-medium text-foreground">{label}</p>
              <div className="mt-3 flex flex-wrap items-end gap-4">
                <label className="text-sm text-foreground">
                  Ville
                  <span className="mt-1 flex items-center gap-1">
                    <MapPin className="size-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      value={sb.ville}
                      onChange={(e) => modifierChamp(index, "ville", e.target.value)}
                      className="w-32 rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground"
                    />
                  </span>
                </label>
                <label className="text-sm text-foreground">
                  Date
                  <span className="mt-1 flex items-center gap-1">
                    <CalendarDays className="size-3.5 text-muted-foreground" />
                    <input
                      type="date"
                      value={sb.date}
                      onChange={(e) => modifierChamp(index, "date", e.target.value)}
                      className="rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground"
                    />
                  </span>
                </label>
                <label className="text-sm text-foreground">
                  Quantité
                  <input
                    type="number"
                    min={1}
                    value={sb.quantite}
                    onChange={(e) => modifierLigne(index, "quantite", Number(e.target.value) || 1)}
                    className="mt-1 block w-20 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                  />
                </label>
                <label className="text-sm text-foreground">
                  Horaire
                  <span className="mt-1 flex items-center gap-1">
                    <input
                      type="time"
                      value={sb.heureDebut}
                      onChange={(e) => modifierChamp(index, "heureDebut", e.target.value)}
                      className="rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground"
                    />
                    <span className="text-muted-foreground">→</span>
                    <input
                      type="time"
                      value={sb.heureFin}
                      onChange={(e) => modifierChamp(index, "heureFin", e.target.value)}
                      className="rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground"
                    />
                  </span>
                </label>
                <label className="text-sm text-foreground">
                  Tarif horaire proposé (€)
                  <input
                    type="number"
                    min={0}
                    step="0.5"
                    value={sb.tarifHoraire ?? ""}
                    onChange={(e) => modifierLigne(index, "tarifHoraire", Number(e.target.value) || 0)}
                    placeholder="Ex. 15"
                    className="mt-1 block w-32 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                  />
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={chargementIndex === index}
                  onClick={() => voirRecommandations(index)}
                  className="rounded-full"
                >
                  <Sparkles className="size-3.5" />
                  {chargementIndex === index
                    ? "Recherche..."
                    : recommandations[index]
                      ? "Actualiser les recommandations"
                      : "Voir les meilleurs professionnels"}
                </Button>
              </div>

              {recommandations[index] && (
                <RecommandationsList
                  recommandations={recommandations[index].recommandations.slice(0, 5)}
                  suffisant={recommandations[index].suffisant}
                  quantite={sb.quantite}
                  enMissionIds={[]}
                />
              )}
            </div>
          );
        })}
      </div>

      <Button type="button" onClick={publier} disabled={envoi} className="mt-6 rounded-full">
        <Send className="size-3.5" />
        {envoi ? "Publication..." : "Publier ma demande"}
      </Button>
    </div>
  );
}
