import { Hero } from "@/components/marketing/hero";
import { RelationSection } from "@/components/marketing/relation-section";
import { FreelancesCarousel } from "@/components/marketing/freelances-carousel";

export default function Home() {
  return (
    <>
      <Hero />
      <RelationSection />
      <FreelancesCarousel />
    </>
  );
}
