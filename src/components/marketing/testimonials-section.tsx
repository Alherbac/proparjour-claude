import { RevealOnScroll } from "@/components/motion/reveal-on-scroll";
import { SectionHead } from "@/components/marketing/section-head";
import { Testimonial } from "@/components/marketing/testimonial";

const TESTIMONIALS = [
  {
    citation:
      "On a recruté deux agents pour un salon en moins de deux heures, contrat et facture déjà prêts le lendemain matin.",
    nom: "Sophie R.",
    role: "Office manager, Paris",
  },
  {
    citation:
      "Je choisis mes journées de dispo, je vois les missions qui correspondent à mes spécialités, et je suis payé sans relance.",
    nom: "Karim B.",
    role: "Agent de sécurité, CNAPS",
  },
  {
    citation:
      "On a pu prendre trois hôtesses et un vendeur pour le même événement, dans un seul panier, avec des horaires différents.",
    nom: "Antoine D.",
    role: "Chef de projet événementiel",
  },
] as const;

export function TestimonialsSection() {
  return (
    <section className="py-32 max-[900px]:py-20">
      <div className="mx-auto max-w-[1200px] px-10 max-[900px]:px-6">
        <RevealOnScroll>
          <SectionHead eyebrow="Ce qu'ils en disent" titre="Recruteurs et prestataires, même plateforme" />
        </RevealOnScroll>
        <div className="grid grid-cols-3 gap-5 max-[900px]:grid-cols-1">
          {TESTIMONIALS.map((testimonial, index) => (
            <RevealOnScroll key={testimonial.nom} delayMs={index * 80}>
              <Testimonial {...testimonial} />
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
