"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Plus } from "lucide-react";
import { AdminH1 } from "@/components/admin/ui/section";
import { AdminButton } from "@/components/admin/ui/button";
import { AdminInput } from "@/components/admin/ui/input";
import { AdminBadge, type AdminBadgeTone } from "@/components/admin/ui/badge";
import type { VilleAdminCarte } from "@/lib/admin/pilotage";
import { creerVilleAdmin, basculerVilleAdmin } from "@/app/actions/admin-villes";

const TENSION_INFO: Record<VilleAdminCarte["tension"], { label: string; tone: AdminBadgeTone }> = {
  equilibree: { label: "Équilibrée", tone: "green" },
  a_surveiller: { label: "À surveiller", tone: "gold" },
  tendue: { label: "Tendue", tone: "orange" },
  tres_tendue: { label: "Très tendue", tone: "red" },
};

function CarteVille({ ville }: { ville: VilleAdminCarte }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function basculer() {
    startTransition(async () => {
      await basculerVilleAdmin(ville.id, !ville.active);
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-[var(--a-border)] bg-[var(--a-surface)] p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold text-[var(--a-ink)]" style={{ fontFamily: "var(--a-font-display)" }}>{ville.nom}</p>
          <p className="text-[12px] text-[var(--a-text-2)]">{ville.codeZone}</p>
        </div>
        <AdminBadge tone={ville.active ? "green" : "grey"}>{ville.active ? "Active" : "Désactivée"}</AdminBadge>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[var(--a-border)] pt-3">
        <div>
          <p className="a-tabular text-[15px] font-extrabold text-[var(--a-ink)]" style={{ fontFamily: "var(--a-font-display)" }}>{ville.nbPrestataires}</p>
          <p className="text-[10.5px] text-[var(--a-text-3)]">prestataires</p>
        </div>
        <div>
          <p className="a-tabular text-[15px] font-extrabold text-[var(--a-ink)]" style={{ fontFamily: "var(--a-font-display)" }}>{ville.nbMissions}</p>
          <p className="text-[10.5px] text-[var(--a-text-3)]">missions</p>
        </div>
        <div className="flex items-end">
          <AdminBadge tone={TENSION_INFO[ville.tension].tone}>{TENSION_INFO[ville.tension].label}</AdminBadge>
        </div>
      </div>
      <div className="mt-3">
        <AdminButton size="sm" variant="secondary" className="w-full" disabled={isPending} onClick={basculer}>
          {ville.active ? "Désactiver" : "Activer"}
        </AdminButton>
      </div>
    </div>
  );
}

export function VillesScreen({ villes }: { villes: VilleAdminCarte[] }) {
  const router = useRouter();
  const [ajoutOuvert, setAjoutOuvert] = useState(false);
  const [nom, setNom] = useState("");
  const [zone, setZone] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function ajouter() {
    startTransition(async () => {
      const result = await creerVilleAdmin(nom, zone);
      if (!result.success) {
        setErreur(result.error);
        return;
      }
      setAjoutOuvert(false);
      setNom("");
      setZone("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <AdminH1>Villes</AdminH1>
          <p className="mt-1 max-w-2xl text-[13px] text-[var(--a-text-2)]">
            L&apos;autocomplete adresse interroge geo.api.gouv.fr sur toute l&apos;Île-de-France, toujours à jour —
            l&apos;Île-de-France (75 à 95) reste traitée comme une seule zone. Cet écran gère les villes mises en
            avant sur les pages d&apos;atterrissage, avec l&apos;offre et la demande réelles pour prioriser le
            recrutement.
          </p>
        </div>
        <AdminButton variant="primary" onClick={() => setAjoutOuvert((v) => !v)}>
          <Plus className="size-3.5" />
          Ajouter une ville
        </AdminButton>
      </div>

      {ajoutOuvert && (
        <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-[var(--a-border)] bg-[var(--a-surface)] p-4">
          <div>
            <label className="mb-1 block text-[11.5px] font-semibold text-[var(--a-text-2)]">Nom</label>
            <AdminInput value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Paris" className="w-48" />
          </div>
          <div>
            <label className="mb-1 block text-[11.5px] font-semibold text-[var(--a-text-2)]">Zone / code postal</label>
            <AdminInput value={zone} onChange={(e) => setZone(e.target.value)} placeholder="75" className="w-48" />
          </div>
          <AdminButton variant="primary" disabled={isPending} onClick={ajouter}>Enregistrer</AdminButton>
          {erreur && <p className="text-[12px] text-[var(--a-badge-red-text)]">{erreur}</p>}
        </div>
      )}

      {villes.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--a-border-strong)] py-10 text-center text-[13px] text-[var(--a-text-3)]">
          <MapPin className="mx-auto mb-2 size-5 text-[var(--a-text-3)]" />
          Aucune ville configurée pour l&apos;instant.
        </p>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(258px, 100%), 1fr))" }}>
          {villes.map((v) => (
            <CarteVille key={v.id} ville={v} />
          ))}
        </div>
      )}
    </div>
  );
}
