import { RevealOnScroll } from "@/components/motion/reveal-on-scroll";
import { SectionHead } from "@/components/marketing/section-head";

const STEPS = [
  {
    titre: "Publiez votre mission",
    description: "Poste, date, lieu, tarif : votre besoin est en ligne en quelques minutes.",
  },
  {
    titre: "Sélectionnez vos prestataires",
    description:
      "Comparez profils vérifiés, avis et disponibilités, ajoutez-en plusieurs à votre panier.",
  },
  {
    titre: "Contrat automatisé",
    description:
      "Chaque confirmation génère son contrat et sa facture, sans document à préparer.",
  },
  {
    titre: "Paiement sécurisé",
    description:
      "Les fonds sont débloqués une fois la mission validée par les deux parties.",
  },
] as const;

export function StepsSection() {
  return (
    <section id="comment" className="py-32 max-[900px]:py-20">
      <div className="mx-auto max-w-[1200px] px-10 max-[900px]:px-6">
        <RevealOnScroll>
          <div className="relative overflow-hidden rounded-[32px] bg-ink px-[60px] py-[68px] max-[900px]:px-7 max-[900px]:py-12">
            <SectionHead
              eyebrow="Le déroulé d'une mission"
              titre="De la publication au paiement, sans ressaisie"
              tone="dark"
              className="mb-14"
            />
            <div className="relative grid grid-cols-4 gap-0 before:absolute before:inset-x-0 before:top-1.5 before:h-px before:bg-[linear-gradient(90deg,rgba(255,255,255,0.18),rgba(255,255,255,0.05))] before:content-[''] max-[900px]:grid-cols-2 max-[900px]:gap-y-9">
              {STEPS.map((step) => (
                <div key={step.titre} className="px-6 first:pl-0 max-[900px]:pl-0">
                  <div className="relative z-[1] mb-[22px] size-3 rounded-full bg-gold shadow-[0_0_0_5px_var(--color-ink)]" />
                  <h4 className="font-display mb-2.5 text-[16.5px] font-semibold">{step.titre}</h4>
                  <p className="text-[13.5px] leading-[1.65] text-white/55">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
