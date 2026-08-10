"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send, CalendarDays, Clock, Euro } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/onboarding/form-field";
import { VilleAutocompleteIdf } from "@/components/ville-autocomplete-idf";
import { METIERS, type MetierId } from "@/config/metiers";
import { cn } from "@/lib/utils";
import { publierOffre } from "@/app/actions/offres";
import { heuresEntre, montantMission } from "@/lib/duree";

export function PublierMissionForm() {
  const router = useRouter();
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [metier, setMetier] = useState<MetierId | null>(null);
  const [ville, setVille] = useState("");
  const [dateMission, setDateMission] = useState("");
  const [heureDebut, setHeureDebut] = useState("09:00");
  const [heureFin, setHeureFin] = useState("17:00");
  const [tarifHoraire, setTarifHoraire] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const tarifHoraireNombre = Number(tarifHoraire);
  const montantTotalEstime =
    tarifHoraireNombre > 0 && heureDebut !== heureFin
      ? montantMission(heureDebut, heureFin, tarifHoraireNombre)
      : null;
  const nombreHeures =
    montantTotalEstime !== null ? Math.round(heuresEntre(heureDebut, heureFin) * 100) / 100 : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!metier) {
      toast.error("Sélectionnez un métier.");
      return;
    }
    setEnvoi(true);
    const result = await publierOffre({
      titre,
      description,
      metier,
      ville,
      dateMission,
      heureDebut,
      heureFin,
      tarifHoraire: Number(tarifHoraire),
    });
    setEnvoi(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Votre offre a été publiée et les prestataires correspondants ont été notifiés.");
    router.push("/tableau-de-bord/mes-offres");
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-xl space-y-5 px-4 py-10 lg:px-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">Publier une mission</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Votre offre sera visible par tous les prestataires du métier concerné, qui recevront
          aussi une notification.
        </p>
      </div>

      <FormField label="Titre de la mission" htmlFor="titre">
        <Input
          id="titre"
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          placeholder="Ex. Agent de sécurité pour salon professionnel"
          required
        />
      </FormField>

      <FormField label="Métier recherché">
        <div className="grid grid-cols-3 gap-3">
          {METIERS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMetier(m.id)}
              aria-pressed={metier === m.id}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                metier === m.id
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-foreground hover:border-primary/40",
              )}
            >
              {m.filiere}
            </button>
          ))}
        </div>
      </FormField>

      <FormField label="Ville de la mission" htmlFor="ville">
        <VilleAutocompleteIdf id="ville" value={ville} onChange={setVille} />
      </FormField>

      <FormField label="Date de la mission" htmlFor="dateMission">
        <div className="relative">
          <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="dateMission"
            type="date"
            className="pl-8"
            value={dateMission}
            onChange={(e) => setDateMission(e.target.value)}
            required
          />
        </div>
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Début" htmlFor="heureDebut">
          <div className="relative">
            <Clock className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="heureDebut"
              type="time"
              className="pl-8"
              value={heureDebut}
              onChange={(e) => setHeureDebut(e.target.value)}
            />
          </div>
        </FormField>
        <FormField label="Fin" htmlFor="heureFin">
          <Input
            id="heureFin"
            type="time"
            value={heureFin}
            onChange={(e) => setHeureFin(e.target.value)}
          />
        </FormField>
      </div>

      <FormField label="Tarif horaire proposé (€)" htmlFor="tarifHoraire">
        <div className="relative">
          <Euro className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="tarifHoraire"
            type="number"
            min={0}
            step="0.5"
            className="pl-8"
            value={tarifHoraire}
            onChange={(e) => setTarifHoraire(e.target.value)}
            required
          />
        </div>
      </FormField>

      {montantTotalEstime !== null && nombreHeures !== null && (
        <div className="rounded-lg border border-border bg-secondary/30 px-4 py-3">
          <p className="text-sm text-muted-foreground">Montant total de la mission</p>
          <p className="font-heading text-lg font-semibold text-foreground">
            {montantTotalEstime} €
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {tarifHoraireNombre} € / heure × {nombreHeures}h
          </p>
        </div>
      )}

      <FormField label="Description de la mission" htmlFor="description">
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Détaillez le contexte, les missions confiées, les consignes particulières..."
          rows={5}
          required
        />
      </FormField>

      <Button type="submit" className="w-full rounded-full" disabled={envoi}>
        <Send className="size-4" />
        {envoi ? "Publication..." : "Publier l'offre"}
      </Button>
    </form>
  );
}
