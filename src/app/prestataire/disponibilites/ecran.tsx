"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StatCard } from "@/app/prestataire/_components/stat-card";
import { Calendrier } from "@/app/prestataire/_components/calendrier";
import { jourDeLaSemaine } from "@/app/prestataire/_lib";
import { basculerJourDisponibilite, retirerExceptionDisponibilite } from "@/app/prestataire/actions";

function joursDuMois(annee: number, mois: number): string[] {
  const total = new Date(annee, mois, 0).getDate();
  return Array.from({ length: total }, (_, i) => `${annee}-${String(mois).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`);
}

export function EcranDisponibilites({
  disponibilitesHebdo,
  exceptionsInitiales,
  joursMission,
}: {
  disponibilitesHebdo: string[];
  exceptionsInitiales: { date: string; disponible: boolean }[];
  joursMission: string[];
}) {
  const router = useRouter();
  const [exceptions, setExceptions] = useState(exceptionsInitiales);
  const [, startTransition] = useTransition();

  const annee = new Date().getFullYear();
  const mois = new Date().getMonth() + 1;
  const joursMissionSet = useMemo(() => new Set(joursMission), [joursMission]);

  const joursIndisponibles = useMemo(() => {
    const set = new Set<string>();
    for (const date of joursDuMois(annee, mois)) {
      if (joursMissionSet.has(date)) continue;
      const exception = exceptions.find((e) => e.date === date);
      const disponible = exception ? exception.disponible : disponibilitesHebdo.includes(jourDeLaSemaine(date));
      if (!disponible) set.add(date);
    }
    return set;
  }, [annee, mois, exceptions, disponibilitesHebdo, joursMissionSet]);

  const joursOuverts = joursDuMois(annee, mois).filter((d) => !joursMissionSet.has(d) && !joursIndisponibles.has(d)).length;

  function basculer(date: string) {
    const exception = exceptions.find((e) => e.date === date);
    const disponibleActuel = exception ? exception.disponible : disponibilitesHebdo.includes(jourDeLaSemaine(date));
    const nouveau = !disponibleActuel;
    setExceptions((prev) => [...prev.filter((e) => e.date !== date), { date, disponible: nouveau }]);
    startTransition(async () => {
      const res = await basculerJourDisponibilite(date, nouveau);
      if (!res.success) router.refresh();
    });
  }

  function retirer(date: string) {
    setExceptions((prev) => prev.filter((e) => e.date !== date));
    startTransition(() => {
      retirerExceptionDisponibilite(date);
    });
  }

  return (
    <div className="mx-auto space-y-5" style={{ maxWidth: "760px" }}>
      <div>
        <h1 className="text-[26px] text-[#1A1917] sm:text-[30px]" style={{ fontFamily: "var(--font-instrument-serif)" }}>
          Disponibilités
        </h1>
        <p className="mt-1 text-[13.5px] text-[#6B6660]">
          Déclarez les jours où vous ne souhaitez pas travailler. Cliquez sur un jour pour le basculer ; un jour de mission n&apos;est pas modifiable ici.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard label="Jours de mission" valeur={joursMissionSet.size} aide="non modifiables ici" />
        <StatCard label="Indisponibles" valeur={joursIndisponibles.size} aide="déclarés par vous" />
        <StatCard label="Ouverts aux missions" valeur={joursOuverts} />
      </div>

      <div className="rounded-[18px] border border-[#EAE6E0] bg-white p-5">
        <Calendrier annee={annee} mois={mois} joursMission={joursMissionSet} joursIndisponibles={joursIndisponibles} onToggle={basculer} />
      </div>

      {exceptions.filter((e) => !e.disponible).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {exceptions
            .filter((e) => !e.disponible)
            .map((e) => (
              <button
                key={e.date}
                type="button"
                onClick={() => retirer(e.date)}
                className="rounded-[10px] border border-[#DDD8D1] bg-white px-3 py-1.5 text-[12px] font-medium text-[#6B6660] hover:border-[#1A1917]"
              >
                {e.date} · retirer l&apos;exception
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
