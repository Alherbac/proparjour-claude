import { BadgeCheck, CheckCircle2, Star } from "lucide-react";
import { RevealOnScroll } from "@/components/motion/reveal-on-scroll";

const ITEMS = [
  {
    icon: BadgeCheck,
    titre: "Carte CNAPS contrôlée",
    description: "Numéro et validité vérifiés avant activation",
  },
  {
    icon: CheckCircle2,
    titre: "Identité & documents",
    description: "Pièce d'identité et justificatifs à jour",
  },
  {
    icon: Star,
    titre: "Avis après chaque mission",
    description: "Notes croisées, visibles sur chaque carte pro",
  },
] as const;

export function VerifyBand() {
  return (
    <section id="verification" className="py-32 max-[900px]:py-20">
      <div className="mx-auto max-w-[1200px] px-10 max-[900px]:px-6">
        <RevealOnScroll>
          <div className="grid grid-cols-[0.85fr_1.15fr] items-center gap-[60px] rounded-[32px] bg-paper-dim px-[60px] py-16 max-[900px]:grid-cols-1 max-[900px]:px-7 max-[900px]:py-11">
            <div>
              {ITEMS.map((item) => (
                <div
                  key={item.titre}
                  className="mb-[13px] flex items-center gap-[15px] rounded-2xl bg-white p-5 shadow-[var(--shadow-landing-sm)] transition-shadow duration-200 ease-[cubic-bezier(0.16,0.84,0.44,1)] hover:shadow-[var(--shadow-landing-md)]"
                >
                  <span className="flex size-[42px] flex-none items-center justify-center rounded-[11px] bg-emerald/10 text-emerald">
                    <item.icon className="size-5" />
                  </span>
                  <div>
                    <b className="block text-[14.5px] font-semibold text-ink">{item.titre}</b>
                    <span className="text-[12.5px] text-muted-2">{item.description}</span>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <span className="mb-[18px] inline-flex items-center gap-[9px] font-mono-landing text-xs font-medium uppercase tracking-[0.12em] text-muted-landing before:size-1.5 before:rounded-full before:bg-emerald before:shadow-[0_0_0_4px_rgba(24,154,108,0.14)] before:content-['']">
                Vérification, pas déclaration
              </span>
              <h2 className="mb-[18px] text-[31px] font-semibold text-ink">
                Chaque carte pro passe un contrôle avant sa première mission
              </h2>
              <p className="mb-4 text-[15.5px] leading-[1.7] text-muted-landing">
                Les documents d&apos;un agent de sécurité, d&apos;un hôte ou d&apos;un
                vendeur ne se ressemblent pas — ProParJour vérifie ce qui compte
                pour chaque métier : carte professionnelle CNAPS pour la sécurité,
                pièce d&apos;identité pour tous, historique de missions consultable
                par les recruteurs.
              </p>
              <p className="text-[15.5px] leading-[1.7] text-muted-landing">
                Un prestataire non vérifié n&apos;apparaît pas dans les résultats de
                recherche.
              </p>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
