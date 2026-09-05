"use client";

/**
 * Calendrier de disponibilités — dossier design §5. Grille 7 colonnes
 * lundi-first, cellules aspect-ratio 1, min-height 44px, radius 10px.
 * Légende : mission (#E21D1B, non modifiable) · indisponible
 * (#EFEBE6) · libre (#FFFFFF).
 *
 * RÈGLE D'ALIGNEMENT (§5/§6.f) : le nombre de cellules vides avant le
 * jour 1 vient du jour réel de la semaine du 1er du mois, calculé via
 * `Date`, jamais codé en dur — `new Date(annee, mois-1, 1).getDay()`
 * renvoie 0=dimanche..6=samedi ; converti ici en 0=lundi..6=dimanche.
 */
function decalageLundiFirst(annee: number, mois: number): number {
  const jourSemaine = new Date(annee, mois - 1, 1).getDay(); // 0=dim..6=sam
  return (jourSemaine + 6) % 7; // 0=lun..6=dim
}

function nbJoursDansLeMois(annee: number, mois: number): number {
  return new Date(annee, mois, 0).getDate();
}

export function Calendrier({
  annee,
  mois,
  joursMission,
  joursIndisponibles,
  onToggle,
}: {
  annee: number;
  mois: number;
  joursMission: Set<string>;
  joursIndisponibles: Set<string>;
  onToggle?: (dateIso: string) => void;
}) {
  const decalage = decalageLundiFirst(annee, mois);
  const total = nbJoursDansLeMois(annee, mois);
  const cellules: (string | null)[] = [
    ...Array.from({ length: decalage }, () => null),
    ...Array.from({ length: total }, (_, i) => `${annee}-${String(mois).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`),
  ];
  const libelleMois = new Date(annee, mois - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[13px] font-semibold capitalize text-[#1A1917]">{libelleMois}</p>
        <div className="flex items-center gap-3 text-[11.5px] text-[#6B6660]">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-[2px]" style={{ backgroundColor: "#E21D1B" }} />
            mission
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-[2px] border border-[#DDD8D1]" style={{ backgroundColor: "#EFEBE6" }} />
            indisponible
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-[2px] border border-[#DDD8D1] bg-white" />
            libre
          </span>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-[6px]">
        {["L", "M", "M", "J", "V", "S", "D"].map((j, i) => (
          <div key={i} className="text-center text-[11px] font-semibold text-[#98938B]">
            {j}
          </div>
        ))}
        {cellules.map((dateIso, i) => {
          if (!dateIso) return <div key={`vide-${i}`} />;
          const enMission = joursMission.has(dateIso);
          const indisponible = joursIndisponibles.has(dateIso);
          const jour = Number(dateIso.slice(-2));
          return (
            <button
              key={dateIso}
              type="button"
              disabled={enMission || !onToggle}
              onClick={() => onToggle?.(dateIso)}
              title={enMission ? "Mission confirmée — non modifiable" : undefined}
              className="flex items-center justify-center rounded-[10px] text-[13px] font-medium transition-colors"
              style={{
                aspectRatio: "1",
                minHeight: "44px",
                backgroundColor: enMission ? "#E21D1B" : indisponible ? "#EFEBE6" : "#FFFFFF",
                border: enMission ? "none" : "1px solid #EAE6E0",
                color: enMission ? "#FFFFFF" : indisponible ? "#6B6660" : "#1A1917",
                cursor: enMission ? "not-allowed" : onToggle ? "pointer" : "default",
              }}
            >
              {jour}
            </button>
          );
        })}
      </div>
    </div>
  );
}
