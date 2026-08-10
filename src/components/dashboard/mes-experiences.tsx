"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/onboarding/form-field";
import {
  ajouterExperience,
  modifierExperience,
  supprimerExperience,
  type ExperienceInput,
} from "@/app/actions/compte";
import type { ExperiencesRow } from "@/lib/supabase/database.types";

const VIDE: ExperienceInput = { intitule: "", employeur: "", periode: "", lieu: "", description: "" };

function ExperienceForm({
  valeurInitiale,
  onAnnuler,
  onEnregistre,
}: {
  valeurInitiale: ExperienceInput;
  onAnnuler: () => void;
  onEnregistre: (input: ExperienceInput) => Promise<{ success: boolean; error?: string }>;
}) {
  const router = useRouter();
  const [valeurs, setValeurs] = useState(valeurInitiale);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function soumettre(event: React.FormEvent) {
    event.preventDefault();
    setEnvoi(true);
    setErreur(null);
    const result = await onEnregistre(valeurs);
    setEnvoi(false);
    if (!result.success) {
      setErreur(result.error ?? "Une erreur est survenue.");
      return;
    }
    router.refresh();
    onAnnuler();
  }

  return (
    <form onSubmit={soumettre} className="space-y-3 rounded-xl border border-border p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Intitulé du poste / de la mission" htmlFor="exp-intitule">
          <Input
            id="exp-intitule"
            placeholder="ex. Agent de sécurité événementiel"
            value={valeurs.intitule}
            onChange={(e) => setValeurs({ ...valeurs, intitule: e.target.value })}
          />
        </FormField>
        <FormField label="Employeur / contexte" htmlFor="exp-employeur">
          <Input
            id="exp-employeur"
            placeholder="ex. Société Sécuritas"
            value={valeurs.employeur}
            onChange={(e) => setValeurs({ ...valeurs, employeur: e.target.value })}
          />
        </FormField>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Période" htmlFor="exp-periode">
          <Input
            id="exp-periode"
            placeholder="ex. 2022-2023 ou 6 mois"
            value={valeurs.periode}
            onChange={(e) => setValeurs({ ...valeurs, periode: e.target.value })}
          />
        </FormField>
        <FormField label="Lieu (optionnel)" htmlFor="exp-lieu">
          <Input
            id="exp-lieu"
            placeholder="ex. Paris"
            value={valeurs.lieu}
            onChange={(e) => setValeurs({ ...valeurs, lieu: e.target.value })}
          />
        </FormField>
      </div>
      <FormField label="Description (optionnel)" htmlFor="exp-description">
        <Textarea
          id="exp-description"
          rows={3}
          placeholder="Ce que vous avez fait, le contexte de la mission..."
          value={valeurs.description}
          onChange={(e) => setValeurs({ ...valeurs, description: e.target.value })}
        />
      </FormField>
      {erreur && <p className="text-sm text-destructive">{erreur}</p>}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={envoi} className="rounded-full">
          {envoi ? "Enregistrement..." : "Enregistrer"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onAnnuler}>
          Annuler
        </Button>
      </div>
    </form>
  );
}

export function MesExperiences({ experiencesInitiales }: { experiencesInitiales: ExperiencesRow[] }) {
  const router = useRouter();
  const [ajoutOuvert, setAjoutOuvert] = useState(false);
  const [editionId, setEditionId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function supprimer(id: string) {
    startTransition(async () => {
      const result = await supprimerExperience(id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Expérience supprimée.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {experiencesInitiales.length === 0 && !ajoutOuvert && (
        <p className="text-sm text-muted-foreground">
          Aucune expérience ajoutée pour l&apos;instant. Renforcez votre profil auprès des recruteurs.
        </p>
      )}

      <ul className="space-y-3">
        {experiencesInitiales.map((experience) =>
          editionId === experience.id ? (
            <li key={experience.id}>
              <ExperienceForm
                valeurInitiale={{
                  intitule: experience.intitule,
                  employeur: experience.employeur ?? "",
                  periode: experience.periode,
                  lieu: experience.lieu ?? "",
                  description: experience.description ?? "",
                }}
                onAnnuler={() => setEditionId(null)}
                onEnregistre={(input) => modifierExperience(experience.id, input)}
              />
            </li>
          ) : (
            <li key={experience.id} className="rounded-xl border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{experience.intitule}</p>
                  <p className="text-sm text-muted-foreground">
                    {[experience.employeur, experience.periode].filter(Boolean).join(" · ")}
                  </p>
                  {experience.lieu && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3" />
                      {experience.lieu}
                    </p>
                  )}
                  {experience.description && (
                    <p className="mt-1.5 text-sm text-muted-foreground">{experience.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Modifier"
                    onClick={() => setEditionId(experience.id)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Supprimer"
                    onClick={() => supprimer(experience.id)}
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            </li>
          ),
        )}
      </ul>

      {ajoutOuvert ? (
        <ExperienceForm
          valeurInitiale={VIDE}
          onAnnuler={() => setAjoutOuvert(false)}
          onEnregistre={ajouterExperience}
        />
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => setAjoutOuvert(true)}
        >
          <Plus className="size-3.5" />
          Ajouter une expérience
        </Button>
      )}
    </div>
  );
}
