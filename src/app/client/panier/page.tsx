import type { Metadata } from "next";
import { EcranPanier } from "@/app/client/panier/ecran";

export const metadata: Metadata = { title: "Votre panier — ProParJour" };

export default function PagePanier() {
  return <EcranPanier />;
}
