import Link from "next/link";
import { Star, Check } from "lucide-react";
import { METIERS } from "@/config/metiers";
import type { PrestatairesPublicsRow } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { highlightsFamille } from "@/lib/famille-highlights";
import { tarifJournalierAffiche } from "@/lib/tarif";
import { FavoriButton } from "@/components/prestataire/favori-button";

/**
 * Vignette prestataire — "proparjour design final", §7 (remplace la
 * carte verticale "Asia design proparjour" : photo portrait 104×128 à
 * GAUCHE, bloc identité à DROITE, courte — ~440px de haut, aucun
 * extrait d'avis, un seul bouton. Le panier ne vit plus ici : on
 * consulte la fiche avant de décider (§7, "Le parcours : consulter
 * avant de mettre au panier").
 *
 * Origine des données (§7, tableau) :
 * - Années d'expérience : aucune colonne de ce type n'existe dans le
 *   schéma → toujours "Expérience à préciser" plutôt qu'un chiffre
 *   inventé, jamais l'omettre (le README prévoit explicitement ce
 *   repli textuel pour ce champ précis, contrairement à la règle
 *   générale d'omission).
 * - Badge bleu "compte certifié" : mappé sur statut_verification
 *   ("valide"), déjà garanti vrai pour toute ligne de
 *   `prestataires_publics` (la vue ne les expose pas sinon) — chaque
 *   carte affichée l'a donc, ce qui reste honnête : tout prestataire
 *   montré est réellement validé par ProParJour.
 * - Certifications : `prestataires_profils.certifications` est
 *   déclaratif, mais seul un profil déjà validé par un admin
 *   (statut_verification = 'valide', précondition de cette vue)
 *   atteint cette liste — pas de vérification document par document
 *   dans le schéma actuel, c'est la meilleure approximation honnête
 *   disponible de "documents vérifiés".
 * - Disponibilité : les disponibilités déclarées existent, mais rien
 *   ne les croise avec une date de recherche précise dans ce contexte
 *   (parcours catalogue général, pas une recherche datée) → toujours
 *   point ambre "À confirmer", jamais de faux "confirmé".
 */
const NOTE_ANCRE = "avis";

export function PrestataireResultCard({
  prestataire,
  enMission = false,
  missionsTerminees = 0,
  avis = null,
}: {
  prestataire: PrestatairesPublicsRow;
  enMission?: boolean;
  missionsTerminees?: number;
  avis?: { noteMoyenne: number; nbAvis: number } | null;
}) {
  const metier = METIERS.find((m) => m.id === prestataire.metier);
  const prenom = prestataire.prenom ?? "Prestataire";
  const accroche = highlightsFamille(prestataire)[0];
  const compteCertifie = prestataire.statut_verification === "valide";
  const tarifJournalier = prestataire.tarif_montant > 0 ? tarifJournalierAffiche(prestataire.tarif_montant, prestataire.tarif_type) : null;
  const noteArrondie = avis ? Math.round(avis.noteMoyenne) : 0;

  return (
    <div
      className="relative flex h-full flex-col rounded-[20px] border border-ppj-line bg-white px-[18px] pt-5 pb-[18px] transition-[border-color,box-shadow,transform] duration-200 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-[3px] hover:border-ppj-ink hover:shadow-[0_26px_48px_-34px_rgba(26,25,23,.45)]"
      style={{ minWidth: 0 }}
    >
      <FavoriButton
        prestataireId={prestataire.id}
        className="absolute right-2.5 top-2.5 z-[2] size-8 rounded-full border border-ppj-line bg-white shadow-none backdrop-blur-none"
      />

      {/* Ligne haute — photo à gauche, identité à droite */}
      <div className="flex items-start gap-4">
        <div
          className="relative h-32 w-[104px] flex-none overflow-hidden rounded-2xl"
          style={!prestataire.photo_url ? { backgroundImage: "repeating-linear-gradient(135deg, #F0ECE6 0 8px, #E8E3DC 8px 16px)" } : undefined}
        >
          {prestataire.photo_url && (
            // eslint-disable-next-line @next/next/no-img-element -- pas d'autre usage de next/image dans ce projet, cf. next.config.ts sans remotePatterns
            <img src={prestataire.photo_url} alt={prenom} className="size-full object-cover" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="pr-[26px] font-mono text-[10px] tracking-[.16em] text-primary uppercase">
            Expérience à préciser
          </p>

          <div className="mt-1 flex items-start gap-1.5 pr-[22px]">
            <Link
              href={`/prestataires/${prestataire.id}`}
              className="text-[23px] leading-[1.14] tracking-[-.015em] text-ppj-ink hover:text-primary"
              style={{ fontFamily: "var(--font-display-serif)", overflowWrap: "break-word" }}
            >
              {prestataire.titre || metier?.label}
            </Link>
            {compteCertifie && (
              <span
                className="mt-1 flex size-[17px] shrink-0 items-center justify-center rounded-full bg-[#1D74E8]"
                title="Identité contrôlée par ProParJour"
              >
                <Check className="size-2.5 text-white" strokeWidth={3} />
              </span>
            )}
          </div>

          <p className="mt-1 text-[13px] text-ppj-neutral-text">
            {prenom} · {prestataire.ville}
          </p>

          <div className="mt-1 flex flex-nowrap items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={cn("size-[14px] shrink-0", i < noteArrondie ? "fill-primary text-primary" : "fill-[#EAE5DC] text-[#EAE5DC]")}
              />
            ))}
            {avis ? (
              <>
                <span className="ml-1 text-[13px] font-semibold whitespace-nowrap text-ppj-ink">
                  {avis.noteMoyenne.toFixed(1).replace(".", ",")}
                </span>
                <Link
                  href={`/prestataires/${prestataire.id}#${NOTE_ANCRE}`}
                  className="text-[12.5px] whitespace-nowrap text-[#6B6660] underline decoration-solid underline-offset-[3px]"
                >
                  {avis.nbAvis} avis
                </Link>
              </>
            ) : (
              <span className="ml-1 text-[12.5px] whitespace-nowrap text-[#6B6660]">Pas encore d&apos;avis</span>
            )}
          </div>

          <div className="mt-1 flex items-baseline gap-1.5">
            {tarifJournalier !== null ? (
              <>
                <span className="text-[22px] text-ppj-ink" style={{ fontFamily: "var(--font-display-serif)", lineHeight: 1 }}>
                  {tarifJournalier} €
                </span>
                <span className="text-xs text-[#6B6660]">/ jour</span>
              </>
            ) : (
              <span className="text-[13px] text-[#6B6660]">Tarif à préciser</span>
            )}
          </div>
        </div>
      </div>

      {/* Accroche */}
      {accroche && (
        <p
          className="mt-[18px] text-[16.5px] text-[#292723] italic"
          style={{ fontFamily: "var(--font-display-serif)", lineHeight: 1.45, textWrap: "pretty" }}
        >
          « {accroche} »
        </p>
      )}

      {/* Tableau à trois lignes */}
      <div className="mt-[18px] grid gap-px overflow-hidden rounded-xl border border-ppj-line-2 bg-ppj-line-2">
        <div className="flex items-center justify-between gap-3 bg-white px-[13px] py-[11px]">
          <span className="text-xs text-[#6B6660]">Certifications</span>
          <span className="truncate text-right text-[12.5px] text-[#292723]">
            {prestataire.certifications.length > 0 ? prestataire.certifications.join(" · ") : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 bg-white px-[13px] py-[11px]">
          <span className="text-xs text-[#6B6660]">Disponibilité</span>
          <span className="flex items-center gap-1.5 text-[12.5px] text-[#292723]">
            <span className="block size-1.5 shrink-0 rounded-full bg-[#C9A227]" />
            À confirmer
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 bg-white px-[13px] py-[11px]">
          <span className="text-xs text-[#6B6660]">Missions réalisées</span>
          <span className="text-[12.5px] text-[#292723]">
            {missionsTerminees > 0 ? `${missionsTerminees} mission${missionsTerminees > 1 ? "s" : ""}` : "Aucune pour l'instant"}
          </span>
        </div>
      </div>

      {/* Ressort — même contenu affiché, mais des cartes de hauteurs
          naturelles différentes (accroche présente ou non) gardent
          leur bouton aligné en bas de grille (§7 : "toutes les cartes
          de la grille gardent la même hauteur"). */}
      <div className="flex-1" />

      {/* Bouton unique */}
      <Link
        href={`/prestataires/${prestataire.id}`}
        className="mt-[18px] flex min-h-[46px] items-center justify-center rounded-xl bg-ppj-ink text-[14px] font-semibold text-[#FBFAF8] transition-colors hover:bg-primary"
      >
        Voir le profil
      </Link>

      {enMission && (
        <span className="absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-full bg-white/95 py-[5px] pl-2 pr-2.5 text-[11px] font-semibold text-ppj-ink backdrop-blur-sm">
          <span className="block size-1.5 rounded-full bg-[#C9A227]" />
          En mission
        </span>
      )}
    </div>
  );
}
