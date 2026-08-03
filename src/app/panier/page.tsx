import type { Metadata } from "next";
import { PanierContent } from "@/components/panier/panier-content";

export const metadata: Metadata = {
  title: "Mon panier — ProParJour",
};

export default function PanierPage() {
  return <PanierContent />;
}
