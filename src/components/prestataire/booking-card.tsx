"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send, UserPlus, MapPin, CalendarDays, Clock, Euro, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/onboarding/form-field";
import { AdresseAutocomplete } from "@/components/adresse-autocomplete";
import { ajouterLigne } from "@/lib/panier";
import { usePanier } from "@/hooks/use-panier";
import { tarifJournalierAffiche, tarifHoraireReference } from "@/lib/tarif";
import type { MetierId } from "@/config/metiers";
import type { TarifType } from "@/lib/supabase/database.types";

type BookingCardFreelance = {
  id: string;
  prenom: string;
  metier: MetierId;
  ville: string;
  tarifMontant: number;
  tarifType: TarifType;
  photoUrl: string | null;
};

export function BookingCard({ freelance }: { freelance: BookingCardFreelance }) {
  const router = useRouter();
  const panier = usePanier();
  const panierEnCours = panier.lignes.length > 0;
  const tarifReference = tarifHoraireReference(freelance.tarifMontant, freelance.tarifType);
  const [dateMission, setDateMission] = useState("");
  const [adresse, setAdresse] = useState(freelance.ville);
  const [description, setDescription] = useState("");
  const [heureDebut, setHeureDebut] = useState("09:00");
  const [heureFin, setHeureFin] = useState("17:00");
  const [tarifHoraireOffert, setTarifHoraireOffert] = useState(String(tarifReference));
  const [avertissementTarif, setAvertissementTarif] = useState(false);
  const avertissementTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function verifierTarif() {
    const valeur = Number(tarifHoraireOffert);
    if (valeur > 0 && valeur < tarifReference) {
      setAvertissementTarif(true);
      if (avertissementTimeout.current) clearTimeout(avertissementTimeout.current);
      avertissementTimeout.current = setTimeout(() => setAvertissementTarif(false), 3000);
    }
  }

  function validerEtAjouter(): boolean {
    const tarifHoraire = Number(tarifHoraireOffert);
    if (!dateMission || !adresse.trim()) {
      toast.error("Indiquez la date et l'adresse de la mission.");
      return false;
    }
    if (heureFin === heureDebut) {
      toast.error("L'heure de fin doit être différente de l'heure de début.");
      return false;
    }
    if (!tarifHoraire || tarifHoraire <= 0) {
      toast.error("Indiquez un tarif horaire supérieur à 0.");
      return false;
    }

    ajouterLigne({
      prestataireId: freelance.id,
      prenom: freelance.prenom,
      metier: freelance.metier,
      tarifMontant: tarifHoraire,
      tarifType: "horaire",
      heureDebut,
      heureFin,
      photoUrl: freelance.photoUrl,
      date: dateMission,
      adresse: adresse.trim(),
      description: description.trim(),
    });

    toast.success(`${freelance.prenom} a été ajouté(e) à votre mission.`);
    return true;
  }

  function handleProposerSeul() {
    if (validerEtAjouter()) router.push("/panier");
  }

  function handleAjouterEtContinuer() {
    if (validerEtAjouter()) router.push("/prestataires");
  }

  return (
    <div className="rounded-2xl border border-border bg-background p-6 shadow-sm">
      <div className="flex items-baseline gap-1">
        <span className="font-heading text-3xl font-semibold text-foreground">
          {tarifJournalierAffiche(freelance.tarifMontant, freelance.tarifType)} €
        </span>
        <span className="text-sm text-muted-foreground">/ jour</span>
      </div>

      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
        <MapPin className="size-3.5" />
        Intervient à {freelance.ville} et alentours
      </p>

      <div className="mt-5 space-y-3">
        <FormField label="Date de la mission" htmlFor="dateMission">
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="dateMission"
              type="date"
              className="pl-8"
              value={dateMission}
              onChange={(e) => setDateMission(e.target.value)}
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

        <FormField
          label="Tarif horaire que vous proposez (€)"
          htmlFor="tarifHoraireOffert"
          hint={`Tarif de référence de ${freelance.prenom} : ${tarifReference} € / heure.`}
        >
          <div className="relative">
            <Euro className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="tarifHoraireOffert"
              type="number"
              min={0}
              step="0.5"
              className="pl-8"
              value={tarifHoraireOffert}
              onChange={(e) => setTarifHoraireOffert(e.target.value)}
              onBlur={verifierTarif}
            />
          </div>
          {avertissementTarif && (
            <p className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              Ce tarif est plus bas que le tarif horaire indiqué par {freelance.prenom} (
              {tarifReference} € / heure).
            </p>
          )}
        </FormField>

        <FormField label="Adresse exacte de la mission" htmlFor="adresse">
          <AdresseAutocomplete
            id="adresse"
            value={adresse}
            onChange={setAdresse}
            placeholder="Numéro, rue, ville..."
          />
        </FormField>

        <FormField label="Description de la mission (optionnel)" htmlFor="description">
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Détaillez le contexte, les consignes particulières..."
            rows={3}
          />
        </FormField>
      </div>

      <div className="mt-5 space-y-2">
        <Button className="w-full rounded-full" onClick={handleProposerSeul}>
          <Send className="size-4" />
          Proposer à {freelance.prenom}
        </Button>
        <Button variant="outline" className="w-full rounded-full" onClick={handleAjouterEtContinuer}>
          <UserPlus className="size-4" />
          {panierEnCours ? "Ajouter au panier existant" : "Ajouter d'autres prestataires à la mission"}
        </Button>
      </div>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        Aucun engagement — annulation gratuite jusqu&apos;à 48h avant la mission.
      </p>
    </div>
  );
}
