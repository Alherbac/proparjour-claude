"use client";

import { useRef } from "react";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function StepPhoto({
  previewUrl,
  onSelect,
  onRemove,
}: {
  previewUrl: string | null;
  onSelect: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-2xl font-semibold text-foreground">
          Photo de profil
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Les profils avec photo reçoivent davantage de propositions de
          mission.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onSelect(file);
        }}
      />

      {previewUrl ? (
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
          <img
            src={previewUrl}
            alt="Photo de profil"
            className="size-28 rounded-2xl object-cover"
          />
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
            >
              Changer la photo
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="text-destructive"
            >
              <X className="size-3.5" />
              Retirer
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border p-10 text-center transition-colors hover:border-primary/50"
        >
          <ImagePlus className="size-8 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            Ajouter une photo
          </span>
          <span className="text-xs text-muted-foreground">
            JPG ou PNG, fond neutre recommandé
          </span>
        </button>
      )}
    </div>
  );
}
