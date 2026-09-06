"use client";

import { useEffect, useRef, useState } from "react";
import { MESSAGE_HORS_ZONE } from "@/config/zones-couverture";

type Commune = { nom: string; code: string; codesPostaux: string[] };

/**
 * Champ ville, dédié à cet écran d'inscription et stylé selon la
 * maquette (voir PROMPT-INSCRIPTION.txt §3) — volontairement séparé
 * de src/components/ville-autocomplete-idf.tsx, qui est partagé avec
 * la recherche marketing, la capture de besoin et l'inscription
 * recruteur (hors périmètre de cette refonte, RÈGLE N°0). Même source
 * de données (geo.api.gouv.fr, région Île-de-France) et même message
 * hors-zone réel — la contrainte de lancement IDF n'est pas modifiée.
 */
export function VilleInput({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (ville: string) => void;
  error?: boolean;
}) {
  const [suggestions, setSuggestions] = useState<Commune[]>([]);
  const [ouvert, setOuvert] = useState(false);
  const [horsZone, setHorsZone] = useState(false);
  const conteneurRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const requete = value.trim();
    const timeout = setTimeout(
      async () => {
        if (requete.length < 2) {
          setSuggestions([]);
          setHorsZone(false);
          return;
        }
        const params = new URLSearchParams({
          nom: requete,
          codeRegion: "11",
          fields: "nom,code,codesPostaux",
          boost: "population",
          limit: "8",
        });
        const res = await fetch(`https://geo.api.gouv.fr/communes?${params}`);
        const resultats: Commune[] = res.ok ? await res.json() : [];
        setSuggestions(resultats);
        const correspondanceExacte = resultats.some((c) => c.nom.toLowerCase() === requete.toLowerCase());
        setHorsZone(resultats.length === 0 || !correspondanceExacte);
      },
      requete.length < 2 ? 0 : 250,
    );
    return () => clearTimeout(timeout);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (conteneurRef.current && !conteneurRef.current.contains(event.target as Node)) {
        setOuvert(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={conteneurRef} className="relative">
      <input
        value={value}
        autoComplete="off"
        onChange={(event) => {
          onChange(event.target.value);
          setOuvert(true);
        }}
        onFocus={() => setOuvert(true)}
        placeholder="Paris, Lyon, Lille…"
        className={`w-full box-border rounded-xl border bg-[#FCFBF9] px-[14px] py-[13px] font-sans text-[15px] text-[#1A1917] outline-none transition-colors focus:border-[#E21D1B] focus:bg-white ${error ? "border-[#E21D1B]" : "border-[#E6E2DC]"}`}
      />

      {ouvert && suggestions.length > 0 && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-[#EAE6E0] bg-white shadow-[0_8px_24px_rgba(26,25,23,0.08)]">
          {suggestions.map((commune) => (
            <button
              key={commune.code}
              type="button"
              onMouseDown={(event) => {
                // onMouseDown (pas onClick) : s'exécute avant le blur de
                // l'input, qui sinon démonte ce bouton avant qu'un clic
                // n'ait pu se déclencher dessus.
                event.preventDefault();
                onChange(commune.nom);
                setOuvert(false);
                setHorsZone(false);
              }}
              className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-[13.5px] hover:bg-[#F6F4F0]"
            >
              <span className="text-[#1A1917]">{commune.nom}</span>
              <span className="text-[12px] text-[#98938B]">{commune.codesPostaux.join(", ")}</span>
            </button>
          ))}
        </div>
      )}

      {horsZone && value.trim().length > 2 && (
        <p className="mt-1.5 text-[12px] leading-[1.55] text-[#6B6660]">{MESSAGE_HORS_ZONE}</p>
      )}
    </div>
  );
}
