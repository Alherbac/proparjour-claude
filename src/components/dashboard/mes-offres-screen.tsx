"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { METIERS } from "@/config/metiers";
import { repondreCandidature } from "@/app/actions/offres";
import { ajouterLigne } from "@/lib/panier";
import { montantMission } from "@/lib/duree";
import type { OffreAvecCandidatures } from "@/lib/offres";

const STATUT_LABEL: Record<string, string> = {
  publiee: "Publiée",
  pourvue: "Pourvue",
  annulee: "Annulée",
  expiree: "Expirée",
};

function CandidatureRow({
  candidature,
  offre,
}: {
  candidature: OffreAvecCandidatures["candidatures"][number];
  offre: OffreAvecCandidatures;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statut, setStatut] = useState(candidature.statut);

  function repondre(reponse: "acceptee" | "refusee") {
    startTransition(async () => {
      const result = await repondreCandidature(candidature.id, reponse);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setStatut(reponse);

      if (reponse === "refusee") {
        toast.success("Candidature déclinée.");
        return;
      }

      // Accepter une candidature amène directement au panier pour
      // finaliser le paiement avec ce prestataire, aux conditions de
      // l'offre — c'est la suite logique après acceptation.
      ajouterLigne({
        prestataireId: candidature.prestataire_id,
        prenom: candidature.prenom ?? "Prestataire",
        metier: offre.metier,
        tarifMontant: offre.tarif_horaire,
        tarifType: "horaire",
        heureDebut: offre.heure_debut,
        heureFin: offre.heure_fin,
        photoUrl: candidature.photo_url,
        date: offre.date_mission,
        adresse: offre.ville,
        description: offre.description,
      });
      toast.success("Candidature acceptée — ajouté(e) à votre panier pour finaliser le paiement.");
      router.push("/panier");
    });
  }

  const nom = `${candidature.prenom ?? "Prestataire"} ${candidature.nom?.charAt(0) ?? ""}`.trim();

  return (
    <li className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
      <Link href={`/prestataires/${candidature.prestataire_id}`} className="shrink-0">
        {candidature.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- pas d'autre usage de next/image dans ce projet
          <img
            src={candidature.photo_url}
            alt={nom}
            className="size-10 rounded-full object-cover"
          />
        ) : (
          <div className="flex size-10 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-foreground/70">
            {(candidature.prenom ?? "P").charAt(0)}
          </div>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{nom}</p>
        {candidature.message && (
          <p className="truncate text-xs text-muted-foreground">{candidature.message}</p>
        )}
      </div>
      {statut === "en_attente" ? (
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            disabled={isPending}
            onClick={() => repondre("acceptee")}
            aria-label="Accepter la candidature"
          >
            <Check className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            disabled={isPending}
            onClick={() => repondre("refusee")}
            aria-label="Refuser la candidature"
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <Badge variant="secondary" className="shrink-0 font-normal">
          {statut === "acceptee" ? "Acceptée" : "Refusée"}
        </Badge>
      )}
    </li>
  );
}

export function MesOffresScreen({ offres }: { offres: OffreAvecCandidatures[] }) {
  if (offres.length === 0) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3 px-4 py-20 text-center">
        <Briefcase className="size-10 text-muted-foreground" />
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          Aucune offre publiée
        </h1>
        <p className="text-muted-foreground">
          Publiez une mission pour la rendre visible à tous les prestataires du métier concerné.
        </p>
        <Button render={<Link href="/tableau-de-bord/publier-mission" />} className="mt-2 rounded-full">
          Publier une mission
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 lg:px-8 lg:py-14">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl font-semibold text-foreground">Mes offres</h1>
        <Button render={<Link href="/tableau-de-bord/publier-mission" />} className="rounded-full">
          Publier une mission
        </Button>
      </div>

      <div className="mt-6 space-y-4">
        {offres.map((offre) => {
          const metier = METIERS.find((m) => m.id === offre.metier);
          const total = montantMission(offre.heure_debut, offre.heure_fin, offre.tarif_horaire);
          return (
            <div key={offre.id} className="rounded-2xl border border-border bg-background p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">{offre.titre}</p>
                  <p className="text-sm text-muted-foreground">
                    {metier?.filiere} · {offre.ville} · {offre.date_mission} · {offre.heure_debut}–
                    {offre.heure_fin}
                  </p>
                  <p className="text-sm font-medium text-primary">
                    {total} € au total ({offre.tarif_horaire} € / heure)
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0 font-normal">
                  {STATUT_LABEL[offre.statut]}
                </Badge>
              </div>

              <p className="mt-2 text-sm text-muted-foreground">{offre.description}</p>

              <div className="mt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {offre.candidatures.length} candidature{offre.candidatures.length > 1 ? "s" : ""}
                </p>
                {offre.candidatures.length > 0 ? (
                  <ul className="space-y-2">
                    {offre.candidatures.map((c) => (
                      <CandidatureRow key={c.id} candidature={c} offre={offre} />
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucune candidature pour l&apos;instant.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
