"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Commune = {
  nom: string;
  code: string;
  codesPostaux: string[];
};

/**
 * Autocomplétion des communes d'Île-de-France (région INSEE 11) via
 * l'API officielle geo.api.gouv.fr — plutôt qu'une liste figée dans
 * le code (qui ratait des villes comme Le Bourget), cette API couvre
 * les ~1300 communes de la région et leurs codes postaux, à jour.
 * CORS ouvert, pas de clé requise.
 */
async function chercherCommunes(query: string): Promise<Commune[]> {
  const params = new URLSearchParams({
    nom: query,
    codeRegion: "11",
    fields: "nom,code,codesPostaux",
    boost: "population",
    limit: "8",
  });
  const res = await fetch(`https://geo.api.gouv.fr/communes?${params}`);
  if (!res.ok) return [];
  return res.json();
}

export function VilleAutocompleteIdf({
  id,
  value,
  onChange,
  onHorsZoneChange,
  className,
}: {
  id?: string;
  value: string;
  onChange: (ville: string) => void;
  /** Notifie le parent si la saisie actuelle ne correspond à aucune commune d'IDF connue. */
  onHorsZoneChange?: (horsZone: boolean) => void;
  className?: string;
}) {
  const [suggestions, setSuggestions] = useState<Commune[]>([]);
  const [ouvert, setOuvert] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [aCherche, setACherche] = useState(false);
  const conteneurRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const requete = (value ?? "").trim();
    const timeout = setTimeout(
      async () => {
        if (requete.length < 2) {
          setSuggestions([]);
          setACherche(false);
          onHorsZoneChange?.(false);
          return;
        }
        setChargement(true);
        const resultats = await chercherCommunes(requete);
        setSuggestions(resultats);
        setChargement(false);
        setACherche(true);
        const correspondanceExacte = resultats.some(
          (c) => c.nom.toLowerCase() === requete.toLowerCase(),
        );
        onHorsZoneChange?.(resultats.length === 0 || !correspondanceExacte);
      },
      requete.length < 2 ? 0 : 250,
    );
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onHorsZoneChange n'a pas besoin de re-déclencher la recherche
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
    <div ref={conteneurRef} className={cn("relative", className)}>
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          className="pl-9"
          placeholder="Paris, Boulogne-Billancourt..."
          value={value ?? ""}
          autoComplete="off"
          onChange={(event) => {
            onChange(event.target.value);
            setOuvert(true);
          }}
          onFocus={() => setOuvert(true)}
        />
        {chargement && (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {ouvert && aCherche && suggestions.length > 0 && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-background shadow-md">
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
                onHorsZoneChange?.(false);
              }}
              className="flex w-full items-center justify-between gap-3 px-3.5 py-2 text-left text-sm hover:bg-secondary"
            >
              <span className="text-foreground">{commune.nom}</span>
              <span className="font-mono-landing text-xs text-muted-foreground">
                {commune.codesPostaux.join(", ")}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
