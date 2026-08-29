"use client";

/**
 * Refonte Claude Istanbul 1, §4.9 — CTA final. Les deux boutons
 * sélectionnent l'onglet correspondant de la barre recherche/
 * publication (HeroSearchBar, plus haut sur la même page) et
 * ramènent à la hero — même mécanisme d'événement que le bouton
 * « Voir sur un exemple » de MultiMetiers.
 */
export function FinalCta() {
  function allerVers(tab: "recherche" | "publier") {
    window.dispatchEvent(new CustomEvent("proparjour:switch-tab", { detail: { tab } }));
    document.getElementById("recherche")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <section className="border-t border-ppj-line-2 bg-white" style={{ padding: "clamp(72px,9vw,128px) 0" }}>
      <div className="mx-auto max-w-[780px] px-6 text-center">
        <h2
          className="mb-7 text-ppj-ink"
          style={{ fontFamily: "var(--font-display-serif)", fontSize: "clamp(34px,4.4vw,60px)", lineHeight: 1.02, letterSpacing: "-0.022em" }}
        >
          De quoi avez-vous besoin aujourd&apos;hui ?
        </h2>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => allerVers("recherche")}
            className="min-h-[54px] rounded-[14px] bg-primary px-7 text-base font-semibold text-white transition-[background-color,transform] hover:-translate-y-px hover:bg-[#B8130F]"
          >
            Rechercher un professionnel
          </button>
          <button
            type="button"
            onClick={() => allerVers("publier")}
            className="min-h-[54px] rounded-[14px] border border-ppj-line-button bg-white px-7 text-base font-semibold text-ppj-ink transition-[border-color,transform] hover:-translate-y-px hover:border-ppj-ink"
          >
            Publier mon besoin
          </button>
        </div>
      </div>
    </section>
  );
}
