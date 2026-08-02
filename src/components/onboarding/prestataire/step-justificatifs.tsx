"use client";

import { useRef } from "react";
import { useFormContext } from "react-hook-form";
import { FileCheck2, FileUp, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/onboarding/form-field";
import { Input } from "@/components/ui/input";
import type { PrestataireFormValues } from "@/components/onboarding/prestataire/schema";

export function StepJustificatifs({
  file,
  onSelect,
  onRemove,
}: {
  file: File | null;
  onSelect: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    register,
    formState: { errors },
  } = useFormContext<PrestataireFormValues>();

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-2xl font-semibold text-foreground">
          Justificatif CNAPS
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Obligatoire pour activer un profil Agent de sécurité.
        </p>
      </div>

      <div className="flex gap-3 rounded-lg border border-border bg-secondary/40 p-3 text-sm text-muted-foreground">
        <ShieldCheck className="size-5 shrink-0 text-primary" />
        <p>
          Votre carte professionnelle est vérifiée manuellement par notre
          équipe avant l&apos;activation de votre profil (24 à 48h).
        </p>
      </div>

      <FormField
        label="Numéro de carte professionnelle CNAPS"
        htmlFor="numeroCarteCnaps"
        error={errors.numeroCarteCnaps?.message}
      >
        <Input id="numeroCarteCnaps" {...register("numeroCarteCnaps")} />
      </FormField>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(event) => {
          const selected = event.target.files?.[0];
          if (selected) onSelect(selected);
        }}
      />

      {file ? (
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div className="flex items-center gap-2.5 text-sm">
            <FileCheck2 className="size-5 text-primary" />
            <span className="max-w-52 truncate font-medium text-foreground">
              {file.name}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onRemove}
            className="text-destructive"
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary/50"
        >
          <FileUp className="size-7 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            Ajouter le scan ou la photo de votre carte CNAPS
          </span>
          <span className="text-xs text-muted-foreground">
            JPG, PNG ou PDF
          </span>
        </button>
      )}
    </div>
  );
}
