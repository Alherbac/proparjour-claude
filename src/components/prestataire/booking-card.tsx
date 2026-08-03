"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ShoppingCart, MapPin, CalendarDays, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/onboarding/form-field";
import { ajouterLigne, lirePanier } from "@/lib/panier";
import type { MetierId } from "@/config/metiers";
import type { TarifType } from "@/lib/supabase/database.types";

type BookingCardFreelance = {
  id: string;
  prenom: string;
  metier: MetierId;
  ville: string;
  tarifMontant: number;
  tarifType: TarifType;
};

export function BookingCard({ freelance }: { freelance: BookingCardFreelance }) {
  const [dateMission, setDateMission] = useState("");
  const [lieu, setLieu] = useState(freelance.ville);
  const [heureDebut, setHeureDebut] = useState(
    freelance.tarifType === "horaire" ? "09:00" : "08:00",
  );
  const [heureFin, setHeureFin] = useState(
    freelance.tarifType === "horaire" ? "17:00" : "18:00",
  );

  function handleAjouter() {
    // Si un panier est déjà en cours (autre prestataire ajouté depuis
    // une autre fiche), on réutilise son lieu/date par défaut — une
    // mission = un seul événement (voir cahier des charges section 7).
    const panierExistant = lirePanier();
    const dateFinale = dateMission || panierExistant.dateMission;
    const lieuFinal = lieu.trim() || panierExistant.lieu;

    if (!dateFinale || !lieuFinal) {
      toast.error("Indiquez la date et le lieu de la mission.");
      return;
    }
    if (heureFin === heureDebut) {
      toast.error("L'heure de fin doit être différente de l'heure de début.");
      return;
    }

    ajouterLigne(
      {
        prestataireId: freelance.id,
        prenom: freelance.prenom,
        metier: freelance.metier,
        tarifMontant: freelance.tarifMontant,
        tarifType: freelance.tarifType,
        heureDebut,
        heureFin,
      },
      { lieu: lieuFinal, dateMission: dateFinale },
    );

    toast.success(`${freelance.prenom} a été ajouté(e) au panier.`);
  }

  return (
    <div className="rounded-2xl border border-border bg-background p-6 shadow-sm">
      <div className="flex items-baseline gap-1">
        <span className="font-heading text-3xl font-semibold text-foreground">
          {freelance.tarifMontant} €
        </span>
        <span className="text-sm text-muted-foreground">
          / {freelance.tarifType === "horaire" ? "heure" : "jour"}
        </span>
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

        <FormField label="Lieu de la mission" htmlFor="lieu">
          <Input id="lieu" value={lieu} onChange={(e) => setLieu(e.target.value)} />
        </FormField>
      </div>

      <Button className="mt-5 w-full rounded-full" onClick={handleAjouter}>
        <ShoppingCart className="size-4" />
        Ajouter au panier
      </Button>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        Aucun engagement — annulation gratuite jusqu&apos;à 48h avant la mission.
      </p>
    </div>
  );
}
