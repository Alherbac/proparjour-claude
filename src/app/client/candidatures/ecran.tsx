"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StatCard } from "@/app/client/_components/stat-card";
import { FilterPill } from "@/app/client/_components/filter-pill";
import { Badge } from "@/app/client/_components/badge";
import { CertBadge } from "@/app/client/_components/cert-badge";
import { DashButton } from "@/app/client/_components/button";
import { Vignette } from "@/app/client/_components/vignette";
import { BADGE_STATUT_CANDIDATURE } from "@/app/client/_lib";
import { LABEL_METIER, postesAPourvoir, type OffreAvecCandidatures } from "@/app/client/_types";
import { retenirCandidature, reintegrerCandidature } from "@/app/client/actions";
import type { MetierType } from "@/lib/supabase/database.types";

type Filtre = "toutes" | "a_examiner" | "ecartees";

export function EcranCandidatures({ offres }: { offres: OffreAvecCandidatures[] }) {
  const router = useRouter();
  const [filtre, setFiltre] = useState<Filtre>("toutes");
  const [enCours, startTransition] = useTransition();

  const toutesCandidatures = useMemo(() => offres.flatMap((o) => o.candidatures.map((c) => ({ ...c, offre: o }))), [offres]);
  const aExaminer = toutesCandidatures.filter((c) => c.statut === "en_attente").length;
  const ecartees = toutesCandidatures.filter((c) => c.statut === "refusee").length;

  const filtrees = toutesCandidatures.filter((c) => {
    if (filtre === "toutes") return true;
    if (filtre === "a_examiner") return c.statut === "en_attente";
    return c.statut === "refusee";
  });

  function retenir(id: string) {
    startTransition(async () => {
      const res = await retenirCandidature(id);
      if (res.success && res.missionId) router.push(`/missions/${res.missionId}`);
      else router.refresh();
    });
  }
  function reintegrer(id: string) {
    startTransition(() => {
      reintegrerCandidature(id).then(() => router.refresh());
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] text-[#1A1917] sm:text-[30px]" style={{ fontFamily: "var(--font-instrument-serif)" }}>
          Candidatures reçues
        </h1>
        <p className="mt-1.5 max-w-[62ch] text-[13.5px] text-[#6B6660]">
          Les professionnels candidatent un par un sur vos offres publiées. Consultez le profil avant de retenir.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard label="À examiner" valeur={aExaminer} />
        <StatCard label="Écartées" valeur={ecartees} />
        <StatCard label="Postes à pourvoir" valeur={postesAPourvoir(offres)} />
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterPill actif={filtre === "toutes"} onClick={() => setFiltre("toutes")}>Toutes</FilterPill>
        <FilterPill actif={filtre === "a_examiner"} onClick={() => setFiltre("a_examiner")}>À examiner</FilterPill>
        <FilterPill actif={filtre === "ecartees"} onClick={() => setFiltre("ecartees")}>Écartées</FilterPill>
      </div>

      {filtrees.length === 0 ? (
        <p className="py-10 text-center text-[13.5px] text-[#6B6660]">Aucune candidature dans ce filtre.</p>
      ) : (
        <div className="space-y-2.5">
          {filtrees.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-[14px] border border-[#EAE6E0] bg-white p-4">
              <Vignette photoUrl={c.photoUrl} nom={c.prenom || c.nom || "?"} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-[14.5px] font-semibold text-[#1A1917]">{`${c.prenom ?? ""} ${c.nom ?? ""}`.trim() || "Professionnel"}</p>
                  {c.statutVerification === "valide" && <CertBadge />}
                  <Badge tone={BADGE_STATUT_CANDIDATURE[c.statut].tone}>{BADGE_STATUT_CANDIDATURE[c.statut].label}</Badge>
                </div>
                <p className="mt-0.5 text-[13px] font-semibold" style={{ color: "#E21D1B" }}>
                  {LABEL_METIER[c.offre.metier as MetierType]} · {c.offre.titre}
                </p>
                <p className="text-[12.5px] text-[#6B6660]">{c.tarifMontant} € / {c.tarifType === "horaire" ? "heure" : "jour"}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link href={`/prestataires/${c.prestataire_id}`}>
                  <DashButton variant="secondaire">Consulter le profil</DashButton>
                </Link>
                {c.statut === "en_attente" && (
                  <DashButton variant="plein" disabled={enCours} onClick={() => retenir(c.id)}>
                    Retenir
                  </DashButton>
                )}
                {c.statut === "refusee" && (
                  <DashButton variant="secondaire" disabled={enCours} onClick={() => reintegrer(c.id)}>
                    Réintégrer
                  </DashButton>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {toutesCandidatures.length > 0 && (
        <p className="text-[12.5px] leading-relaxed text-[#6B6660]">
          Retenir un candidat ouvre la conversation et lui transmet les détails de la mission. Le paiement n&apos;intervient qu&apos;après son acceptation.
        </p>
      )}
    </div>
  );
}
