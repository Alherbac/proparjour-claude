"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/app/prestataire/_components/badge";
import { DashButton } from "@/app/prestataire/_components/button";
import { dateCourteFr, dateCourteFrHorodatage, cheminJustificatif } from "@/app/prestataire/_lib";
import { creerClientNavigateur } from "@/app/prestataire/_supabase-browser";
import {
  enregistrerPhotoProfil,
  supprimerPhotoProfil,
  ajouterExperience,
  supprimerExperience,
  enregistrerJustificatif,
  demanderSuppressionComptePrestataire,
  type ExperienceInput,
} from "@/app/prestataire/actions";
import type { ExperiencesRow, JustificatifsRow } from "@/lib/supabase/database.types";

type ExperienceAuto = { id: string; intitule: string; lieu: string; date: string };

const TYPES_DOCUMENT: { valeur: string; label: string }[] = [
  { valeur: "carte_cnaps", label: "Carte professionnelle CNAPS" },
  { valeur: "carte_pro", label: "Carte professionnelle" },
  { valeur: "urssaf", label: "Attestation URSSAF" },
  { valeur: "identite", label: "Pièce d'identité" },
  { valeur: "kbis", label: "Extrait Kbis (ou avis de situation SIRENE)" },
];

const STATUT_DOCUMENT: Record<string, { label: string; tone: "vert" | "orange" | "rouge" | "gris" }> = {
  valide: { label: "Validé", tone: "vert" },
  en_attente: { label: "En cours de vérification", tone: "orange" },
  refuse: { label: "Refusé", tone: "rouge" },
};

const MOTIFS_SUPPRESSION = [
  "Je n'utilise plus le service",
  "J'ai trouvé une autre solution",
  "Problème avec le service",
  "Préoccupations liées à la confidentialité",
  "Autre",
];

function CartePhoto({ photoUrlInitial }: { photoUrlInitial: string | null }) {
  const router = useRouter();
  const [photoUrl, setPhotoUrl] = useState(photoUrlInitial);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function choisirFichier(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    if (!fichier) return;
    setEnvoi(true);
    setErreur(null);
    const supabase = creerClientNavigateur();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setErreur("Vous devez être connecté.");
      setEnvoi(false);
      return;
    }
    const extension = fichier.name.split(".").pop() ?? "jpg";
    const chemin = `${user.id}/profile.${extension}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(chemin, fichier, { contentType: fichier.type, upsert: true });
    if (uploadError) {
      setErreur("Impossible d'envoyer cette photo pour le moment.");
      setEnvoi(false);
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(chemin);
    const res = await enregistrerPhotoProfil(data.publicUrl);
    setEnvoi(false);
    if (!res.success) {
      setErreur(res.error);
      return;
    }
    setPhotoUrl(data.publicUrl);
    router.refresh();
  }

  function supprimer() {
    setEnvoi(true);
    supprimerPhotoProfil().then((res) => {
      setEnvoi(false);
      if (res.success) {
        setPhotoUrl(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="rounded-[18px] border border-[#EAE6E0] bg-white p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-[110px] w-[88px] shrink-0 items-center justify-center rounded-[10px] bg-[#F6F4F0] text-center text-[10px] text-[#98938B]" style={{ backgroundImage: photoUrl ? `url(${photoUrl})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}>
          {!photoUrl && "photo de profil"}
        </div>
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold text-[#1A1917]">Photo de profil</h2>
          <p className="mt-1 text-[13px] text-[#6B6660]">Portrait net, cadré aux épaules, en tenue professionnelle. C&apos;est le premier élément que le client voit.</p>
          {erreur && <p className="mt-1 text-[12.5px]" style={{ color: "#8E2A26" }}>{erreur}</p>}
          <div className="mt-3 flex gap-2">
            <label>
              <input type="file" accept="image/*" className="hidden" onChange={choisirFichier} disabled={envoi} />
              <span className="inline-flex min-h-[38px] cursor-pointer items-center rounded-[10px] bg-[#1A1917] px-3.5 text-[12.5px] font-semibold text-[#FBFAF8] hover:bg-[#E21D1B]">
                {envoi ? "Envoi..." : "Remplacer la photo"}
              </span>
            </label>
            {photoUrl && (
              <DashButton variant="secondaire" disabled={envoi} onClick={supprimer}>
                Supprimer
              </DashButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CarteExperiences({ auto, manuellesInitiales }: { auto: ExperienceAuto[]; manuellesInitiales: ExperiencesRow[] }) {
  const router = useRouter();
  const [manuelles, setManuelles] = useState(manuellesInitiales);
  const [ouvert, setOuvert] = useState(false);
  const [valeurs, setValeurs] = useState<ExperienceInput>({ intitule: "", employeur: "", periode: "", lieu: "", description: "" });
  const [envoi, startTransition] = useTransition();

  function ajouter(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await ajouterExperience(valeurs);
      if (res.success) {
        setOuvert(false);
        setValeurs({ intitule: "", employeur: "", periode: "", lieu: "", description: "" });
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }
  function retirer(id: string) {
    setManuelles((prev) => prev.filter((e) => e.id !== id));
    startTransition(() => {
      supprimerExperience(id);
    });
  }

  return (
    <div className="rounded-[18px] border border-[#EAE6E0] bg-white p-5">
      <div className="mb-3.5 flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-[#1A1917]">Expériences</h2>
        <DashButton variant="secondaire" onClick={() => setOuvert((v) => !v)}>
          Ajouter une expérience
        </DashButton>
      </div>
      <p className="mb-3.5 text-[12.5px] text-[#6B6660]">Les missions réalisées via ProParJour s&apos;ajoutent automatiquement. Ajoutez ici ce que vous avez fait ailleurs.</p>

      <div className="space-y-2.5">
        {auto.map((e) => (
          <div key={e.id} className="rounded-[12px] border border-[#EAE6E0] p-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[13.5px] font-semibold text-[#1A1917]">{e.intitule}</p>
              <Badge tone="bleu">Via ProParJour</Badge>
            </div>
            <p className="mt-0.5 text-[12.5px] text-[#6B6660]">{dateCourteFr(e.date)} · {e.lieu}</p>
          </div>
        ))}
        {manuelles.map((e) => (
          <div key={e.id} className="flex items-start justify-between gap-3 rounded-[12px] border border-[#EAE6E0] p-3.5">
            <div className="min-w-0">
              <p className="text-[13.5px] font-semibold text-[#1A1917]">{e.intitule}</p>
              <p className="text-[12.5px] text-[#6B6660]">{[e.employeur, e.periode].filter(Boolean).join(" · ")}</p>
              {e.description && <p className="mt-1 text-[12.5px] text-[#6B6660]">{e.description}</p>}
            </div>
            <button type="button" disabled={envoi} onClick={() => retirer(e.id)} className="shrink-0 text-[12px] font-semibold" style={{ color: "#B8130F" }}>
              Retirer
            </button>
          </div>
        ))}
        {auto.length === 0 && manuelles.length === 0 && !ouvert && <p className="text-[13px] text-[#6B6660]">Aucune expérience pour l&apos;instant.</p>}
      </div>

      {ouvert && (
        <form onSubmit={ajouter} className="mt-3.5 space-y-2.5 rounded-[12px] border border-[#EAE6E0] p-3.5">
          <input required placeholder="Intitulé du poste" value={valeurs.intitule} onChange={(e) => setValeurs({ ...valeurs, intitule: e.target.value })} className="w-full rounded-[10px] border border-[#DDD8D1] px-3 py-2 text-[13px]" />
          <div className="grid grid-cols-2 gap-2.5">
            <input placeholder="Employeur" value={valeurs.employeur} onChange={(e) => setValeurs({ ...valeurs, employeur: e.target.value })} className="rounded-[10px] border border-[#DDD8D1] px-3 py-2 text-[13px]" />
            <input required placeholder="Période (ex. 2022-2023)" value={valeurs.periode} onChange={(e) => setValeurs({ ...valeurs, periode: e.target.value })} className="rounded-[10px] border border-[#DDD8D1] px-3 py-2 text-[13px]" />
          </div>
          <input placeholder="Lieu (optionnel)" value={valeurs.lieu} onChange={(e) => setValeurs({ ...valeurs, lieu: e.target.value })} className="w-full rounded-[10px] border border-[#DDD8D1] px-3 py-2 text-[13px]" />
          <textarea placeholder="Description (optionnel)" value={valeurs.description} onChange={(e) => setValeurs({ ...valeurs, description: e.target.value })} className="w-full rounded-[10px] border border-[#DDD8D1] px-3 py-2 text-[13px]" rows={2} />
          <div className="flex gap-2">
            <DashButton variant="plein" disabled={envoi}>{envoi ? "Enregistrement..." : "Enregistrer"}</DashButton>
            <DashButton type="button" variant="secondaire" onClick={() => setOuvert(false)}>Annuler</DashButton>
          </div>
        </form>
      )}
    </div>
  );
}

function CarteDocuments({ justificatifsInitiaux }: { justificatifsInitiaux: JustificatifsRow[] }) {
  const router = useRouter();
  const [envoiType, setEnvoiType] = useState<string | null>(null);

  async function deposer(typeDocument: string, fichier: File) {
    setEnvoiType(typeDocument);
    const supabase = creerClientNavigateur();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setEnvoiType(null);
      return;
    }
    const extension = fichier.name.split(".").pop() ?? "bin";
    const chemin = cheminJustificatif(user.id, typeDocument, extension);
    const { error: uploadError } = await supabase.storage.from("justificatifs").upload(chemin, fichier, { contentType: fichier.type });
    if (!uploadError) await enregistrerJustificatif(typeDocument, chemin);
    setEnvoiType(null);
    router.refresh();
  }

  return (
    <div className="rounded-[18px] border border-[#EAE6E0] bg-white p-5">
      <h2 className="text-[15px] font-bold text-[#1A1917]">CV et pièces</h2>
      <p className="mt-1 mb-3.5 text-[12.5px] text-[#6B6660]">Vos pièces ne sont jamais visibles par les clients. Elles servent à la validation de votre dossier.</p>
      <div className="divide-y divide-[#EFEBE6]">
        {TYPES_DOCUMENT.map((t) => {
          const doc = justificatifsInitiaux.filter((j) => j.type_document === t.valeur).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
          const statut = doc ? STATUT_DOCUMENT[doc.statut] : null;
          return (
            <div key={t.valeur} className="flex items-center gap-2.5 py-3 first:pt-0 last:pb-0">
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: doc ? (doc.statut === "refuse" ? "#E09A3A" : "#3DB87A") : "#DDD8D1" }} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-[#1A1917]">{t.label}</p>
                <p className="text-[11.5px] text-[#6B6660]">
                  {doc ? `${statut?.label} · déposé le ${dateCourteFrHorodatage(doc.created_at)}` : "Aucun document envoyé"}
                  {doc?.motif_refus && ` — ${doc.motif_refus}`}
                </p>
              </div>
              <label>
                <input
                  type="file"
                  className="hidden"
                  disabled={envoiType === t.valeur}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) deposer(t.valeur, f);
                  }}
                />
                <span className="inline-flex min-h-[36px] cursor-pointer items-center rounded-[10px] border border-[#DDD8D1] bg-white px-3 text-[12px] font-semibold text-[#1A1917] hover:border-[#1A1917]">
                  {envoiType === t.valeur ? "Envoi..." : doc ? "Remplacer" : "Ajouter"}
                </span>
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CarteSuppression() {
  const [motif, setMotif] = useState<string | null>(null);
  const [envoi, startTransition] = useTransition();
  const [resultat, setResultat] = useState<{ ok: boolean; message: string } | null>(null);

  function confirmer() {
    if (!motif) return;
    startTransition(async () => {
      const res = await demanderSuppressionComptePrestataire(motif);
      setResultat(res.success ? { ok: true, message: "Votre demande a été enregistrée." } : { ok: false, message: res.error });
    });
  }

  return (
    <div className="rounded-[18px] border p-5" style={{ borderColor: "rgba(226,29,27,.28)" }}>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-[15px] font-bold text-[#1A1917]">Supprimer mon compte</h2>
        <Badge tone="rouge">Irréversible</Badge>
      </div>
      <p className="mb-4 text-[13px] leading-relaxed text-[#6B6660]">
        Le profil disparaît de la recherche immédiatement. Les missions passées et les factures sont conservées le temps prévu par la loi. Une mission en cours doit d&apos;abord être terminée.
      </p>
      {resultat ? (
        <p className="text-[13px]" style={{ color: resultat.ok ? "#2A8355" : "#8E2A26" }}>{resultat.message}</p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {MOTIFS_SUPPRESSION.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMotif(m)}
                className="rounded-[10px] px-3 py-2 text-[12.5px] font-medium transition-colors"
                style={motif === m ? { backgroundColor: "#1A1917", color: "#FBFAF8" } : { backgroundColor: "#FFFFFF", border: "1px solid #DDD8D1", color: "#1A1917" }}
              >
                {m}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={!motif || envoi}
            onClick={confirmer}
            className="min-h-[44px] rounded-[10px] px-4 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed"
            style={motif ? { backgroundColor: "#B8130F", color: "#FFFFFF" } : { backgroundColor: "#F0EDE8", color: "#98938B", cursor: "not-allowed" }}
          >
            {envoi ? "Envoi..." : "Confirmer la suppression"}
          </button>
        </>
      )}
    </div>
  );
}

export function EcranProfil({
  photoUrl,
  experiencesAuto,
  experiencesManuelles,
  justificatifs,
}: {
  photoUrl: string | null;
  experiencesAuto: ExperienceAuto[];
  experiencesManuelles: ExperiencesRow[];
  justificatifs: JustificatifsRow[];
}) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[26px] text-[#1A1917] sm:text-[30px]" style={{ fontFamily: "var(--font-instrument-serif)" }}>
          Votre profil
        </h1>
        <p className="mt-1 text-[13.5px] text-[#6B6660]">Ce que les clients voient de vous.</p>
      </div>
      <CartePhoto photoUrlInitial={photoUrl} />
      <CarteExperiences auto={experiencesAuto} manuellesInitiales={experiencesManuelles} />
      <CarteDocuments justificatifsInitiaux={justificatifs} />
      <CarteSuppression />
    </div>
  );
}
