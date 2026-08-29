"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight } from "lucide-react";
import { VilleAutocompleteIdf } from "@/components/ville-autocomplete-idf";
import { infosFamille } from "@/config/famille-metiers";
import { METIERS } from "@/config/metiers";

/**
 * Barre de recherche à deux champs (métier + ville), à la Malt —
 * volontairement distincte de BesoinCapture (parcours "Publier un
 * besoin") : ici on cherche, on ne construit pas une offre. Les
 * résultats n'apparaissent qu'une fois la recherche exécutée
 * (soumission), pas au fil de la frappe.
 */
export function RechercheBar({ texteInitial, villeInitial }: { texteInitial?: string; villeInitial?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(texteInitial ?? "");
  const [ville, setVille] = useState(villeInitial ?? "");

  function rechercher(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams({ mode: "recherche" });
    if (q.trim()) params.set("q", q.trim());
    if (ville.trim()) params.set("ville", ville.trim());
    router.push(`/prestataires?${params.toString()}`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <form
        onSubmit={rechercher}
        className="flex flex-col overflow-hidden rounded-[22px] border border-ppj-line bg-white transition-shadow focus-within:border-primary sm:flex-row sm:items-center"
        style={{ boxShadow: "var(--shadow-ppj-bar)" }}
      >
        <div className="flex flex-1 items-center gap-2.5 px-5 py-3.5">
          <Search className="size-5 shrink-0 text-ppj-text-4" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Vendeur, hôtesse, agent de sécurité..."
            className="w-full min-w-0 bg-transparent text-base text-ppj-ink outline-none placeholder:text-ppj-text-4"
          />
        </div>

        <div className="hidden h-8 w-px shrink-0 bg-ppj-line sm:block" />
        <div className="h-px w-full shrink-0 bg-ppj-line sm:hidden" />

        <div className="flex items-center gap-2.5 px-5 py-3.5 sm:w-52">
          <VilleAutocompleteIdf
            value={ville}
            onChange={setVille}
            className="[&_input]:h-auto [&_input]:border-0 [&_input]:bg-transparent [&_input]:py-0 [&_input]:shadow-none [&_input]:focus-visible:ring-0"
          />
        </div>

        <div className="p-1.5 sm:pl-0">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-primary px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#B8130F] sm:w-auto"
          >
            Rechercher
            <ArrowRight className="size-4" />
          </button>
        </div>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 text-sm text-ppj-text-3">
        {METIERS.map((m, i) => (
          <span key={m.id} className="flex items-center gap-2">
            {i > 0 && <span className="text-ppj-line-button">·</span>}
            <button
              type="button"
              onClick={() => router.push(`/prestataires?mode=recherche&metier=${m.id}`)}
              className="underline-offset-2 hover:text-ppj-ink hover:underline"
            >
              {infosFamille(m.id).emoji} {m.filiere}
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
