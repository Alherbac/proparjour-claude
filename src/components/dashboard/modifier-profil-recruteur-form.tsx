"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { FormField } from "@/components/onboarding/form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { mettreAJourProfilRecruteur } from "@/app/actions/compte";

export function ModifierProfilRecruteurForm({
  profil,
  entreprise,
}: {
  profil: { prenom: string | null; nom: string | null; telephone: string | null; ville: string | null };
  entreprise: { raison_sociale: string; siret: string; secteur_activite: string } | null;
}) {
  const router = useRouter();
  const [prenom, setPrenom] = useState(profil.prenom ?? "");
  const [nom, setNom] = useState(profil.nom ?? "");
  const [telephone, setTelephone] = useState(profil.telephone ?? "");
  const [ville, setVille] = useState(profil.ville ?? "");
  const [raisonSociale, setRaisonSociale] = useState(entreprise?.raison_sociale ?? "");
  const [siret, setSiret] = useState(entreprise?.siret ?? "");
  const [secteurActivite, setSecteurActivite] = useState(entreprise?.secteur_activite ?? "");
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ type: "succes" | "erreur"; texte: string } | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setEnvoi(true);
    setMessage(null);

    const result = await mettreAJourProfilRecruteur({
      prenom,
      nom,
      telephone,
      ville,
      ...(entreprise ? { entreprise: { raisonSociale, siret, secteurActivite } } : {}),
    });

    setEnvoi(false);
    if (!result.success) {
      setMessage({ type: "erreur", texte: result.error });
      return;
    }
    setMessage({ type: "succes", texte: "Profil mis à jour." });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Prénom" htmlFor="prenom">
          <Input id="prenom" value={prenom} onChange={(e) => setPrenom(e.target.value)} />
        </FormField>
        <FormField label="Nom" htmlFor="nom">
          <Input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} />
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Téléphone" htmlFor="telephone">
          <Input id="telephone" value={telephone} onChange={(e) => setTelephone(e.target.value)} />
        </FormField>
        <FormField label="Ville" htmlFor="ville">
          <Input id="ville" value={ville} onChange={(e) => setVille(e.target.value)} />
        </FormField>
      </div>

      {entreprise && (
        <div className="space-y-4 border-t border-border pt-4">
          <FormField label="Raison sociale" htmlFor="raisonSociale">
            <Input id="raisonSociale" value={raisonSociale} onChange={(e) => setRaisonSociale(e.target.value)} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="SIRET" htmlFor="siret" hint="14 chiffres">
              <Input
                id="siret"
                value={siret}
                onChange={(e) => setSiret(e.target.value.replace(/\D/g, "").slice(0, 14))}
                inputMode="numeric"
              />
            </FormField>
            <FormField label="Secteur d'activité" htmlFor="secteurActivite">
              <Input id="secteurActivite" value={secteurActivite} onChange={(e) => setSecteurActivite(e.target.value)} />
            </FormField>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 border-t border-border pt-4">
        <Button type="submit" disabled={envoi} className="rounded-full">
          {envoi && <Loader2 className="size-3.5 animate-spin" />}
          Enregistrer
        </Button>
        {message && (
          <p className={cn("text-sm", message.type === "succes" ? "text-muted-foreground" : "text-destructive")}>
            {message.texte}
          </p>
        )}
      </div>
    </form>
  );
}
