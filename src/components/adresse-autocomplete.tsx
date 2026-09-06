"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";

type BanFeature = { properties: { label: string } };
type BanResponse = { features?: BanFeature[] };

/**
 * Autocomplete d'adresse française exacte (numéro + rue + ville) via
 * l'API Adresse officielle data.gouv.fr (Base Adresse Nationale) —
 * gratuite, sans clé, ouverte en CORS. Permet de distinguer "rue
 * Robert" à Toulouse de "Rue Robert et Sonia Delaunay" à Paris 11e.
 */
export function AdresseAutocomplete({
  id,
  value,
  onChange,
  placeholder,
  className,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Classes de l'input, pour un espace dont les champs suivent un système visuel différent (garde "pl-8" par défaut). */
  className?: string;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [ouvert, setOuvert] = useState(false);
  const conteneurRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const requete = (value ?? "").trim();
    const delai = requete.length < 3 ? 0 : 250;
    const timeout = setTimeout(() => {
      if (requete.length < 3) {
        setSuggestions([]);
        return;
      }
      fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(requete)}&limit=5`)
        .then((r) => r.json())
        .then((data: BanResponse) => {
          setSuggestions((data.features ?? []).map((f) => f.properties.label));
        })
        .catch(() => setSuggestions([]));
    }, delai);
    return () => clearTimeout(timeout);
  }, [value]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (conteneurRef.current && !conteneurRef.current.contains(e.target as Node)) {
        setOuvert(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={conteneurRef} className="relative">
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[#98938B]" />
        <Input
          id={id}
          className={className ?? "pl-8"}
          value={value ?? ""}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(e) => {
            onChange(e.target.value);
            setOuvert(true);
          }}
          onFocus={() => setOuvert(true)}
        />
      </div>
      {ouvert && suggestions.length > 0 && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-[10px] border border-[#DDD8D1] bg-white shadow-md">
          {suggestions.map((label) => (
            <button
              key={label}
              type="button"
              className="block w-full px-3 py-2 text-left text-[13px] text-[#1A1917] hover:bg-[#F6F4F0]"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(label);
                setSuggestions([]);
                setOuvert(false);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
