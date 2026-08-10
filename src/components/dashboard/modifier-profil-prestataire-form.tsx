"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, FormProvider } from "react-hook-form";
import { X, Loader2, ImagePlus, Camera } from "lucide-react";
import { FormField } from "@/components/onboarding/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StepLocalisation } from "@/components/onboarding/prestataire/step-localisation";
import { StepSpecialites } from "@/components/onboarding/prestataire/step-specialites";
import {
  PRESTATAIRE_DEFAULT_VALUES,
  type PrestataireFormValues,
} from "@/components/onboarding/prestataire/schema";
import type {
  MetierType,
  PrestatairesProfilsRow,
  UsersRow,
} from "@/lib/supabase/database.types";
import { mettreAJourProfilPrestataire } from "@/app/actions/compte";
import { uploaderPhotoProfil } from "@/lib/avatar-upload";
import { cn } from "@/lib/utils";

const TARIF_TYPES = [
  { value: "journalier", label: "Au jour (TJM)" },
  { value: "horaire", label: "À l'heure" },
] as const;

function TagInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  const [brouillon, setBrouillon] = useState("");

  function ajouter() {
    const tag = brouillon.trim();
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setBrouillon("");
  }

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1 font-normal">
              {tag}
              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v !== tag))}
                className="ml-0.5 rounded-full hover:text-destructive"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <Input
        value={brouillon}
        onChange={(event) => setBrouillon(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            ajouter();
          }
        }}
        onBlur={ajouter}
        placeholder={placeholder}
      />
    </div>
  );
}

export function ModifierProfilPrestataireForm({
  user,
  profil,
}: {
  user: Pick<UsersRow, "prenom" | "nom" | "telephone">;
  profil: PrestatairesProfilsRow;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const methods = useForm<PrestataireFormValues>({
    defaultValues: {
      ...PRESTATAIRE_DEFAULT_VALUES,
      prenom: user.prenom ?? "",
      nom: user.nom ?? "",
      email: "",
      telephone: user.telephone ?? "",
      metier: profil.metier as MetierType,
      titre: profil.titre ?? "",
      statutIndependant: profil.statut_independant,
      numeroCarteCnaps: profil.numero_carte_cnaps ?? "",
      certifications: profil.certifications,
      langues: profil.langues,
      tenue: profil.tenue ?? "",
      secteurExperience: profil.secteur_experience ?? "",
      remunerationCommission: profil.remuneration_commission,
      specialites: profil.specialites,
      ville: profil.ville,
      tarifType: profil.tarif_type,
      tarifMontant: profil.tarif_montant,
    },
  });
  const { register, handleSubmit, watch } = methods;

  const [bio, setBio] = useState(profil.bio ?? "");
  const [competences, setCompetences] = useState<string[]>(profil.competences);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(profil.photo_url);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ type: "succes" | "erreur"; texte: string } | null>(
    null,
  );

  const prenom = watch("prenom");
  const tarifType = watch("tarifType");

  async function onSubmit(data: PrestataireFormValues) {
    setEnvoi(true);
    setMessage(null);

    let photoUrl: string | undefined;
    if (photoFile) {
      const resultat = await uploaderPhotoProfil(photoFile);
      if (!resultat.success) {
        setEnvoi(false);
        setMessage({ type: "erreur", texte: resultat.error });
        return;
      }
      photoUrl = resultat.url;
    }

    const result = await mettreAJourProfilPrestataire({
      prenom: data.prenom,
      nom: data.nom,
      telephone: data.telephone,
      titre: data.titre,
      bio,
      ville: data.ville,
      statutIndependant: data.statutIndependant,
      tarifType: data.tarifType,
      tarifMontant: Number(data.tarifMontant),
      specialites: data.specialites,
      competences,
      numeroCarteCnaps: data.numeroCarteCnaps ?? "",
      certifications: data.certifications,
      langues: data.langues,
      tenue: data.tenue ?? "",
      secteurExperience: data.secteurExperience ?? "",
      remunerationCommission: data.remunerationCommission,
      photoUrl,
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
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setPhotoFile(file);
              setPhotoPreviewUrl(URL.createObjectURL(file));
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="group relative shrink-0"
            aria-label="Changer la photo de profil"
          >
            {photoPreviewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- pas d'autre usage de next/image dans ce projet
              <img
                src={photoPreviewUrl}
                alt={prenom || "Photo de profil"}
                className="size-20 rounded-full object-cover ring-2 ring-transparent transition-all group-hover:ring-primary/40"
              />
            ) : (
              <div className="flex size-20 items-center justify-center rounded-full bg-secondary text-muted-foreground ring-2 ring-transparent transition-all group-hover:ring-primary/40">
                <ImagePlus className="size-7" />
              </div>
            )}
            <span className="absolute -right-1 -bottom-1 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
              <Camera className="size-3.5" />
            </span>
          </button>
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="size-4" />
            {photoPreviewUrl ? "Changer la photo" : "Ajouter une photo"}
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Prénom" htmlFor="prenom">
            <Input id="prenom" {...register("prenom")} />
          </FormField>
          <FormField label="Nom" htmlFor="nom">
            <Input id="nom" {...register("nom")} />
          </FormField>
        </div>
        <FormField label="Téléphone" htmlFor="telephone">
          <Input id="telephone" {...register("telephone")} />
        </FormField>

        <FormField label="Votre titre professionnel" htmlFor="titre">
          <Input
            id="titre"
            placeholder="ex. Agent de sécurité événementiel..."
            {...register("titre")}
          />
        </FormField>

        <FormField label="Présentation (bio)" htmlFor="bio">
          <Textarea
            id="bio"
            rows={4}
            placeholder="Présentez votre parcours et votre expérience en quelques phrases."
            value={bio}
            onChange={(event) => setBio(event.target.value)}
          />
        </FormField>

        <StepLocalisation />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Type de tarif">
            <div className="grid grid-cols-2 gap-3">
              {TARIF_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  aria-pressed={tarifType === type.value}
                  onClick={() => methods.setValue("tarifType", type.value)}
                  className={cn(
                    "rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
                    tarifType === type.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-foreground hover:border-primary/40",
                  )}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </FormField>
          <FormField label="Montant (€)" htmlFor="tarifMontant">
            <Input
              id="tarifMontant"
              type="number"
              min={0}
              step="0.5"
              {...register("tarifMontant", { valueAsNumber: true })}
            />
          </FormField>
        </div>

        <StepSpecialites />

        <FormField label="Compétences">
          <TagInput
            value={competences}
            onChange={setCompetences}
            placeholder="Tapez une compétence puis Entrée"
          />
        </FormField>

        <div className="flex items-center gap-3 border-t border-border pt-4">
          <Button type="submit" disabled={envoi} className="rounded-full">
            {envoi && <Loader2 className="size-3.5 animate-spin" />}
            Enregistrer
          </Button>
          {message && (
            <p
              className={cn(
                "text-sm",
                message.type === "succes" ? "text-muted-foreground" : "text-destructive",
              )}
            >
              {message.texte}
            </p>
          )}
        </div>
      </form>
    </FormProvider>
  );
}
