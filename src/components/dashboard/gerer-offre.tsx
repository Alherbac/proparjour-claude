"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, XCircle, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { modifierOffre, cloturerOffre, supprimerOffre, type ModifierOffreInput } from "@/app/actions/offres";
import type { OffresRow } from "@/lib/supabase/database.types";

function ModifierOffreDialog({ offre, open, onOpenChange }: { offre: OffresRow; open: boolean; onOpenChange: (v: boolean) => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [valeurs, setValeurs] = useState<ModifierOffreInput>({
    titre: offre.titre,
    description: offre.description,
    ville: offre.ville,
    dateMission: offre.date_mission,
    heureDebut: offre.heure_debut.slice(0, 5),
    heureFin: offre.heure_fin.slice(0, 5),
    tarifHoraire: offre.tarif_horaire,
  });

  function enregistrer() {
    setErreur(null);
    startTransition(async () => {
      const result = await modifierOffre(offre.id, valeurs);
      if (!result.success) {
        setErreur(result.error);
        return;
      }
      toast.success("Offre mise à jour.");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier l&apos;offre</DialogTitle>
          <DialogDescription>Possible tant qu&apos;aucune candidature n&apos;a été acceptée.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {erreur && <p className="text-sm text-destructive">{erreur}</p>}
          <Input value={valeurs.titre} onChange={(e) => setValeurs({ ...valeurs, titre: e.target.value })} placeholder="Titre" />
          <Textarea
            value={valeurs.description}
            onChange={(e) => setValeurs({ ...valeurs, description: e.target.value })}
            placeholder="Description"
            rows={3}
          />
          <Input value={valeurs.ville} onChange={(e) => setValeurs({ ...valeurs, ville: e.target.value })} placeholder="Ville" />
          <div className="grid grid-cols-3 gap-2">
            <Input
              type="date"
              value={valeurs.dateMission}
              onChange={(e) => setValeurs({ ...valeurs, dateMission: e.target.value })}
            />
            <Input
              type="time"
              value={valeurs.heureDebut}
              onChange={(e) => setValeurs({ ...valeurs, heureDebut: e.target.value })}
            />
            <Input
              type="time"
              value={valeurs.heureFin}
              onChange={(e) => setValeurs({ ...valeurs, heureFin: e.target.value })}
            />
          </div>
          <Input
            type="number"
            min={0}
            step="0.5"
            value={valeurs.tarifHoraire}
            onChange={(e) => setValeurs({ ...valeurs, tarifHoraire: Number(e.target.value) })}
            placeholder="Tarif horaire (€)"
          />
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Annuler</DialogClose>
          <Button onClick={enregistrer} disabled={isPending}>
            {isPending && <Loader2 className="size-3.5 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function GererOffre({ offre, aCandidatureAcceptee }: { offre: OffresRow; aCandidatureAcceptee: boolean }) {
  const router = useRouter();
  const [dialogEdition, setDialogEdition] = useState(false);
  const [dialogCloture, setDialogCloture] = useState(false);
  const [dialogSuppression, setDialogSuppression] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (aCandidatureAcceptee) return null;

  function cloturer() {
    startTransition(async () => {
      const result = await cloturerOffre(offre.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Offre clôturée.");
      setDialogCloture(false);
      router.refresh();
    });
  }

  function supprimer() {
    startTransition(async () => {
      const result = await supprimerOffre(offre.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Offre supprimée.");
      setDialogSuppression(false);
      router.refresh();
    });
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      {offre.statut === "publiee" && (
        <Button size="icon-sm" variant="ghost" aria-label="Modifier l'offre" onClick={() => setDialogEdition(true)}>
          <Pencil className="size-3.5" />
        </Button>
      )}
      {offre.statut === "publiee" && (
        <Button size="icon-sm" variant="ghost" aria-label="Clôturer l'offre" onClick={() => setDialogCloture(true)}>
          <XCircle className="size-3.5" />
        </Button>
      )}
      <Button size="icon-sm" variant="ghost" aria-label="Supprimer l'offre" onClick={() => setDialogSuppression(true)}>
        <Trash2 className="size-3.5" />
      </Button>

      <ModifierOffreDialog offre={offre} open={dialogEdition} onOpenChange={setDialogEdition} />

      <Dialog open={dialogCloture} onOpenChange={setDialogCloture}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Clôturer cette offre ?</DialogTitle>
            <DialogDescription>
              Les candidatures en attente seront refusées et leurs auteurs recevront une notification.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Annuler</DialogClose>
            <Button variant="destructive" onClick={cloturer} disabled={isPending}>
              {isPending && <Loader2 className="size-3.5 animate-spin" />}
              Clôturer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogSuppression} onOpenChange={setDialogSuppression}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer cette offre ?</DialogTitle>
            <DialogDescription>Cette action est définitive.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Annuler</DialogClose>
            <Button variant="destructive" onClick={supprimer} disabled={isPending}>
              {isPending && <Loader2 className="size-3.5 animate-spin" />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
