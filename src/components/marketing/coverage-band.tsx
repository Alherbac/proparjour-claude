import { RevealOnScroll } from "@/components/motion/reveal-on-scroll";

const DEPARTEMENTS = ["Paris", "Hauts-de-Seine", "Seine-Saint-Denis", "Val-de-Marne", "Yvelines"];

export function CoverageBand() {
  return (
    <section className="py-32 max-[900px]:py-20">
      <div className="mx-auto max-w-[1200px] px-10 max-[900px]:px-6">
        <RevealOnScroll>
          <div className="flex flex-wrap items-center justify-between gap-6 rounded-[32px] bg-ink px-[60px] py-12 text-white max-[900px]:px-7 max-[900px]:py-9">
            <div>
              <b className="font-display mb-1.5 block text-[21px] font-semibold">
                Disponible en Île-de-France
              </b>
              <span className="text-sm text-white/55">Bientôt dans le reste de la France</span>
            </div>
            <div className="flex max-w-[440px] flex-wrap justify-end gap-2.5 max-[900px]:justify-start">
              {DEPARTEMENTS.map((d) => (
                <span
                  key={d}
                  className="rounded-[20px] border border-white/18 px-3.5 py-2 font-mono-landing text-xs text-white/72"
                >
                  {d}
                </span>
              ))}
              <span className="rounded-[20px] border border-gold/40 px-3.5 py-2 font-mono-landing text-xs text-gold">
                + toute la France, bientôt
              </span>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
