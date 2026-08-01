import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import { FreelanceCard } from "@/components/marketing/freelance-card";
import { FREELANCES_DEMO } from "@/data/freelances-demo";

export function FreelancesCarousel() {
  return (
    <section className="bg-secondary/30 py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Freelances de la région
          </h2>
          <p className="mt-3 text-muted-foreground">
            Des professionnels qualifiés près de chez vous en Île-de-France.
          </p>
        </div>

        <Carousel
          opts={{ align: "start", loop: true }}
          className="mt-12 px-2 sm:px-10"
        >
          <CarouselContent>
            {FREELANCES_DEMO.map((freelance) => (
              <CarouselItem
                key={freelance.id}
                className="sm:basis-1/2 lg:basis-1/4"
              >
                <FreelanceCard freelance={freelance} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden sm:flex" />
          <CarouselNext className="hidden sm:flex" />
        </Carousel>
      </div>
    </section>
  );
}
