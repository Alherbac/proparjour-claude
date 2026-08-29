import type { Metadata } from "next";
import { PropositionContent } from "@/components/panier/proposition-content";

export const metadata: Metadata = {
  title: "Proposer la mission — ProParJour",
};

export default function ProposerPage() {
  return <PropositionContent />;
}
