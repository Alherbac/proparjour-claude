"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Search, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdresseAutocomplete } from "@/components/adresse-autocomplete";
import { METIERS, type MetierId } from "@/config/metiers";
import { usePanier } from "@/hooks/use-panier";
import { viderPanier } from "@/lib/panier";
import { extraireBesoin, detecterAdresse, extraireSousBesoins } from "@/lib/besoin";
import { proposerMission, type LigneProposition } from "@/app/actions/proposition";
import { cn } from "@/lib/utils";

type ChampsMetier = {
  heureDebut: string;
  heureFin: string;
  precisions: string;
  reconnuHoraires: boolean;
};

type Onglet = "commun" | MetierId;

/**
 * "proparjour 6-7" §9, refondu selon README §11 ("RÉVISÉ, remplace §9
 * et §10" — confirmé par les captures de référence du dossier
 * "Proparjour design a jour") : les métiers deviennent des ONGLETS
 * au-dessus d'un panneau de saisie unique plutôt que des blocs
 * empilés — la hauteur ne bouge plus, que le panier compte deux ou
 * six métiers. Le bloc « commun à toute la mission » n'existe QUE si
 * au moins deux métiers sont retenus (un seul, rien à mettre en
 * commun : tout tient dans un seul panneau). Écran de passage entre
 * le panier et l'envoi réel — réutilise tel quel le moteur de
 * compréhension du besoin (lib/besoin.ts) pour le pré-remplissage,
 * jamais un second moteur. Envoie une seule mission avec toutes les
 * lignes 'en_attente' (actions/proposition.ts) — rien n'est payé ici,
 * le paiement n'intervient qu'à l'acceptation d'un professionnel
 * (carte de devis existante en messagerie).
 *
 * Non fait dans ce chantier (signalé plutôt que bricolé) : l'envoi
 * individuel "Profil / Envoyer" par professionnel décrit au §11
 * suppose un appel serveur par personne — proposerMission crée
 * aujourd'hui UNE mission avec toutes les lignes en un seul appel.
 * Ajouter un envoi partiel aurait dépassé "ne touche qu'à cet écran" ;
 * le bouton "Profil" reste, "Envoyer" individuel n'a pas été ajouté.
 */
export function PropositionContent() {
  const router = useRouter();
  const panier = usePanier();
  const [isPending, startTransition] = useTransition();

  const [phrase, setPhrase] = useState("");
  const [analyse, setAnalyse] = useState(false);
  const [phraseOuverte, setPhraseOuverte] = useState(false);

  const [titre, setTitre] = useState("");
  const [date, setDate] = useState("");
  const [dateReconnue, setDateReconnue] = useState(false);
  const [adresse, setAdresse] = useState("");
  const [villeReconnue, setVilleReconnue] = useState<string | null>(null);
  const [contexte, setContexte] = useState("");
  const [contexteReconnu, setContexteReconnu] = useState(false);

  const metiersRetenus = useMemo(() => {
    const set = new Set<MetierId>();
    for (const l of panier.lignes) set.add(l.metier);
    return METIERS.filter((m) => set.has(m.id));
  }, [panier.lignes]);

  const multiMetiers = metiersRetenus.length >= 2;

  const [champsParMetier, setChampsParMetier] = useState<Partial<Record<MetierId, ChampsMetier>>>({});
  const [onglet, setOnglet] = useState<Onglet>("commun");
  const ongletActif: Onglet = multiMetiers ? onglet : (metiersRetenus[0]?.id ?? "commun");

  function champs(metier: MetierId): ChampsMetier {
    return champsParMetier[metier] ?? { heureDebut: "", heureFin: "", precisions: "", reconnuHoraires: false };
  }

  function analyserPhrase() {
    if (!phrase.trim()) return;
    const besoin = extraireBesoin(phrase);
    const adresseDetectee = detecterAdresse(phrase);
    const sousBesoins = extraireSousBesoins(phrase);

    if (besoin.date) {
      setDate(besoin.date);
      setDateReconnue(true);
    }
    if (adresseDetectee?.villeDevinee) {
      setVilleReconnue(adresseDetectee.villeDevinee);
      if (!adresse.trim()) setAdresse(adresseDetectee.villeDevinee);
    }
    if (besoin.contexte) {
      setContexte(besoin.contexte.label);
      setContexteReconnu(true);
    }

    setChampsParMetier((prev) => {
      const next = { ...prev };
      for (const sb of sousBesoins) {
        if (!metiersRetenus.some((m) => m.id === sb.metier)) continue;
        if (sb.heureDebut && sb.heureFin) {
          next[sb.metier] = {
            heureDebut: sb.heureDebut,
            heureFin: sb.heureFin,
            precisions: next[sb.metier]?.precisions ?? "",
            reconnuHoraires: true,
          };
        }
      }
      return next;
    });

    setAnalyse(true);
  }

  const communComplet = titre.trim().length > 0 && date.length > 0 && adresse.trim().length > 0;
  const metierComplet = (m: MetierId) => {
    const c = champs(m);
    return Boolean(c.heureDebut && c.heureFin);
  };

  const manques: { label: string; scope: string; onglet: Onglet }[] = [];
  if (!titre.trim()) manques.push({ label: "Titre de la mission", scope: "commun", onglet: "commun" });
  if (!date) manques.push({ label: "Date de la mission", scope: "commun", onglet: "commun" });
  if (!adresse.trim()) manques.push({ label: "Adresse exacte", scope: "commun", onglet: "commun" });
  for (const m of metiersRetenus) {
    if (!metierComplet(m.id)) manques.push({ label: "Horaires du poste", scope: m.label, onglet: m.id });
  }

  const pretAEnvoyer = communComplet && metiersRetenus.every((m) => metierComplet(m.id));

  function envoyer() {
    if (!pretAEnvoyer) return;
    const lignes: LigneProposition[] = panier.lignes.map((l) => {
      const c = champs(l.metier);
      return {
        prestataireId: l.prestataireId,
        prenom: l.prenom,
        heureDebut: c.heureDebut,
        heureFin: c.heureFin,
        precisions: c.precisions,
      };
    });
    startTransition(async () => {
      const resultat = await proposerMission({ titre: titre.trim(), date, adresse: adresse.trim(), contexte, lignes });
      if (!resultat.success) {
        toast.error(resultat.error);
        return;
      }
      viderPanier();
      toast.success(`Mission proposée à ${lignes.length} professionnel${lignes.length > 1 ? "s" : ""}.`);
      router.push(`/missions/${resultat.data.missionId}`);
    });
  }

  if (panier.lignes.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-14 text-center lg:px-8">
        <p className="text-[15px] text-ppj-text-3">
          Votre panier est vide —{" "}
          <Link href="/panier" className="font-semibold text-primary hover:underline">
            retournez-y
          </Link>{" "}
          pour retenir des professionnels avant de proposer une mission.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-ppj-paper lg:h-screen">
      <div className="shrink-0 px-4 pt-5 lg:px-6 lg:pt-[22px]">
        <Link href="/panier" className="text-[13px] text-ppj-text-3 hover:text-ppj-ink">
          ← Retour au panier
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1
              className="text-ppj-ink"
              style={{ fontFamily: "var(--font-display-serif)", fontSize: "30px", lineHeight: 1.05, letterSpacing: "-0.02em" }}
            >
              Détails de la mission
            </h1>
            <p className="mt-1 text-[13.5px] text-ppj-text-2">
              {panier.lignes.length} professionnel{panier.lignes.length > 1 ? "s" : ""} retenu
              {panier.lignes.length > 1 ? "s" : ""} · {metiersRetenus.length} métier{metiersRetenus.length > 1 ? "s" : ""} · rien
              n&apos;est encore envoyé
            </p>
          </div>

          {/* Capture en langage naturel — conservée (aucune fonctionnalité
              retirée), mais réduite à une simple bascule au lieu du bandeau
              ~130px de l'ancienne version : les valeurs reconnues vont
              directement dans les champs, le compteur vit dans la colonne
              de droite (README §11). */}
          <button
            type="button"
            onClick={() => setPhraseOuverte((v) => !v)}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-ppj-line px-3 text-[12.5px] font-medium text-ppj-text-3 transition-colors hover:border-ppj-ink hover:text-ppj-ink"
          >
            <Search className="size-3.5" />
            {phraseOuverte ? "Masquer" : "Décrire en une phrase"}
          </button>
        </div>

        {phraseOuverte && (
          <div className="mt-3 flex items-center gap-2 rounded-[13px] border border-ppj-red-border bg-ppj-red-bg px-3.5 py-2.5">
            <input
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              onBlur={analyserPhrase}
              placeholder="« vendredi à Paris, de 18h à minuit »…"
              className="min-w-0 flex-1 bg-transparent text-[13.5px] text-ppj-ink placeholder:text-ppj-text-4 focus:outline-none"
            />
            {analyse && <span className="shrink-0 text-[12px] text-ppj-red-text">Reconnu ✓</span>}
          </div>
        )}
      </div>

      <div className="mt-4 grid min-h-0 flex-1 gap-0 overflow-y-auto px-4 pb-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-5 lg:overflow-hidden lg:px-6 lg:pb-[22px]">
        {/* Colonne gauche — onglets puis panneau de saisie */}
        <div className="flex min-h-0 min-w-0 flex-col lg:overflow-hidden">
          {multiMetiers && (
            <div role="tablist" className="mb-3 flex shrink-0 flex-wrap gap-1.5">
              <Onglets
                actif={ongletActif === "commun"}
                complet={communComplet}
                onClick={() => setOnglet("commun")}
                label="Commun à tous"
              />
              {metiersRetenus.map((m) => {
                const nb = panier.lignes.filter((l) => l.metier === m.id).length;
                // Forme courte pour l'onglet — même dérivation que la
                // barre de recherche (hero-search-bar.tsx) : le premier
                // mot de la filière, jamais un libellé inventé.
                const court = m.filiere.split(" ")[0].replace("&", "").trim() || m.filiere;
                return (
                  <Onglets
                    key={m.id}
                    actif={ongletActif === m.id}
                    complet={metierComplet(m.id)}
                    onClick={() => setOnglet(m.id)}
                    label={`${court} ${nb}`}
                  />
                );
              })}
            </div>
          )}

          <div className="min-h-0 rounded-[18px] border border-ppj-line bg-white p-5 lg:flex-1 lg:overflow-y-auto">
            {(!multiMetiers || ongletActif === "commun") && (
              <div className={cn(multiMetiers ? "" : "mb-5 border-b border-ppj-line-2 pb-5")}>
                {multiMetiers && (
                  <p className="mb-3.5 text-[12px] text-ppj-text-3">
                    Commun à tous les métiers — saisi une seule fois, les horaires se règlent dans chaque onglet
                    métier.
                  </p>
                )}
                <div className="grid gap-[13px]">
                  <ChampSaisie label="Titre de la mission" manquant={!titre.trim()}>
                    <input
                      value={titre}
                      onChange={(e) => setTitre(e.target.value)}
                      placeholder="Ex. Soirée d'inauguration — 28 août"
                      className={champInputClass}
                    />
                  </ChampSaisie>
                  <ChampSaisie label="Date de la mission" reconnu={dateReconnue} manquant={!date}>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => {
                        setDate(e.target.value);
                        setDateReconnue(false);
                      }}
                      className={champInputClass}
                    />
                  </ChampSaisie>
                  <ChampSaisie
                    label="Adresse exacte"
                    reconnu={Boolean(villeReconnue)}
                    reconnuDetail={villeReconnue ? `« ${villeReconnue} » reconnu` : undefined}
                    manquant={!adresse.trim()}
                  >
                    <AdresseAutocomplete
                      id="adresse-proposition"
                      value={adresse}
                      onChange={(v) => setAdresse(v)}
                      placeholder="Numéro, rue, code postal"
                    />
                  </ChampSaisie>
                  <ChampSaisie label="Contexte de la mission" reconnu={contexteReconnu} optionnel>
                    <textarea
                      value={contexte}
                      onChange={(e) => {
                        setContexte(e.target.value);
                        setContexteReconnu(false);
                      }}
                      rows={2}
                      placeholder="Type d'événement, nombre d'invités attendus…"
                      className={cn(champInputClass, "resize-none leading-[1.5]")}
                    />
                  </ChampSaisie>
                </div>
              </div>
            )}

            {metiersRetenus.map((m) => {
              if (multiMetiers && ongletActif !== m.id) return null;
              const c = champs(m.id);
              const nb = panier.lignes.filter((l) => l.metier === m.id).length;
              const autreAvecHoraires = metiersRetenus.find(
                (autre) => autre.id !== m.id && champs(autre.id).heureDebut && champs(autre.id).heureFin,
              );
              return (
                <div key={m.id} className="grid gap-[13px]">
                  <p className="text-[12px] text-ppj-text-3">
                    {nb} candidat{nb > 1 ? "s" : ""} retenu{nb > 1 ? "s" : ""} pour {m.label}.
                  </p>
                  <div>
                    <span className="mb-1.5 flex items-center gap-2 text-[12.5px] font-semibold text-ppj-ink">
                      Horaires de ce poste
                      {c.reconnuHoraires ? (
                        <Badge>reconnu</Badge>
                      ) : !c.heureDebut || !c.heureFin ? (
                        <BadgeManquant>requis</BadgeManquant>
                      ) : null}
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={c.heureDebut}
                        onChange={(e) =>
                          setChampsParMetier((prev) => ({
                            ...prev,
                            [m.id]: { ...champs(m.id), heureDebut: e.target.value, reconnuHoraires: false },
                          }))
                        }
                        className={inputHoraireClass(!c.heureDebut)}
                      />
                      <span className="text-[13px] text-ppj-text-4">→</span>
                      <input
                        type="time"
                        value={c.heureFin}
                        onChange={(e) =>
                          setChampsParMetier((prev) => ({
                            ...prev,
                            [m.id]: { ...champs(m.id), heureFin: e.target.value, reconnuHoraires: false },
                          }))
                        }
                        className={inputHoraireClass(!c.heureFin)}
                      />
                    </div>
                    {!c.heureDebut && autreAvecHoraires && (
                      <button
                        type="button"
                        onClick={() =>
                          setChampsParMetier((prev) => ({
                            ...prev,
                            [m.id]: {
                              ...champs(m.id),
                              heureDebut: champs(autreAvecHoraires.id).heureDebut,
                              heureFin: champs(autreAvecHoraires.id).heureFin,
                              reconnuHoraires: false,
                            },
                          }))
                        }
                        className="mt-2 rounded-full border border-ppj-line bg-ppj-fill px-2.5 py-[5px] text-[12px] text-ppj-neutral-text hover:border-ppj-ink"
                      >
                        Comme {autreAvecHoraires.label} ({champs(autreAvecHoraires.id).heureDebut} → {champs(autreAvecHoraires.id).heureFin})
                      </button>
                    )}
                  </div>
                  <ChampSaisie label="Précisions pour ce métier" optionnel>
                    <textarea
                      value={c.precisions}
                      onChange={(e) =>
                        setChampsParMetier((prev) => ({ ...prev, [m.id]: { ...champs(m.id), precisions: e.target.value } }))
                      }
                      rows={2}
                      placeholder="Ex. costume sombre, contrôle d'accès, oreillette fournie…"
                      className={cn(champInputClass, "resize-none leading-[1.5]")}
                    />
                  </ChampSaisie>
                </div>
              );
            })}
          </div>
        </div>

        {/* Colonne droite — 340px fixe, sticky sur desktop */}
        <div className="mt-5 flex min-w-0 flex-col gap-3.5 lg:mt-0 lg:overflow-y-auto lg:pr-0.5">
          <div className="rounded-[18px] border border-ppj-line bg-white p-[18px]">
            <div className="mb-3.5 flex items-center gap-2">
              <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-ppj-text-5">Professionnels retenus</span>
              <span className="ml-auto text-[12px] text-ppj-text-3">{panier.lignes.length}</span>
            </div>
            <div className="grid gap-3.5">
              {metiersRetenus.map((m) => (
                <div key={m.id}>
                  <span className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-ppj-text-2">
                    <span
                      className="grid size-5 flex-none place-items-center rounded-[6px] border border-ppj-red-border bg-ppj-red-bg text-[12px] text-primary"
                      style={{ fontFamily: "var(--font-display-serif)" }}
                    >
                      {m.label.charAt(0)}
                    </span>
                    {m.label}
                  </span>
                  <div className="grid gap-2">
                    {panier.lignes
                      .filter((l) => l.metier === m.id)
                      .map((l, i) => {
                        const c = champs(m.id);
                        return (
                          <div
                            key={`${l.prestataireId}-${i}`}
                            className="flex items-center gap-2.5 rounded-xl border border-ppj-line-2 px-2.5 py-[9px]"
                          >
                            {l.photoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element -- pas d'autre usage de next/image dans ce projet
                              <img src={l.photoUrl} alt={l.prenom} className="size-[34px] shrink-0 rounded-lg object-cover" />
                            ) : (
                              <div
                                className="size-[34px] shrink-0 rounded-lg"
                                style={{ backgroundImage: "repeating-linear-gradient(135deg, #F0ECE6 0 6px, #E4DFD7 6px 12px)" }}
                              />
                            )}
                            <span className="min-w-0 flex-1">
                              <span className="block text-[13.5px] font-semibold text-ppj-ink">{l.prenom}</span>
                              <span className="mt-0.5 block text-[12px] text-ppj-text-3">
                                {l.tarifMontant} € / {l.tarifType === "horaire" ? "heure" : "jour"}
                                {c.heureDebut && c.heureFin ? ` · ${c.heureDebut} → ${c.heureFin}` : ""}
                              </span>
                            </span>
                            <Link
                              href={`/prestataires/${l.prestataireId}`}
                              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-[9px] border border-ppj-line-button px-2.5 text-[12px] font-semibold text-ppj-ink transition-colors hover:border-ppj-ink"
                            >
                              Profil
                            </Link>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[18px] border border-ppj-line bg-white p-[18px]">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-[13.5px] font-semibold text-ppj-ink">Avant l&apos;envoi</p>
              {manques.length > 0 && <span className="text-[12px] text-ppj-red-text">{manques.length} à compléter</span>}
            </div>
            {manques.length === 0 ? (
              <p className="flex items-center gap-2 text-[13px] font-medium" style={{ color: "#2E7D4F" }}>
                <Check /> Tout est renseigné.
              </p>
            ) : (
              <div className="grid gap-1.5">
                {manques.map((m, i) => (
                  <button
                    key={`${m.label}-${m.scope}-${i}`}
                    type="button"
                    onClick={() => setOnglet(m.onglet)}
                    className="flex min-h-11 items-center gap-2.5 rounded-lg px-1.5 text-left text-[13px] font-semibold text-ppj-red-text transition-colors hover:bg-ppj-red-bg"
                  >
                    <Dot /> {m.label} — {m.scope}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[18px] border border-ppj-line bg-white p-[18px]">
            <div className="grid gap-2.5 text-[13.5px]">
              {metiersRetenus.map((m) => {
                const nb = panier.lignes.filter((l) => l.metier === m.id).length;
                const c = champs(m.id);
                return (
                  <span key={m.id} className="flex items-center justify-between gap-3">
                    <span className="text-ppj-text-2">
                      {m.filiere} · {nb} pro{nb > 1 ? "s" : ""}
                      {c.heureDebut && c.heureFin ? ` · ${heuresDuree(c.heureDebut, c.heureFin)} h` : ""}
                    </span>
                    <span>selon devis</span>
                  </span>
                );
              })}
              <span className="my-0.5 block h-px bg-ppj-line-2" />
              <span className="flex items-center justify-between gap-3 font-semibold text-ppj-ink">
                <span>Total</span>
                <span>au devis de chacun</span>
              </span>
            </div>
            <Button
              className="mt-4 min-h-[50px] w-full rounded-[13px] bg-primary text-[15px] font-semibold text-white hover:bg-[#B8130F]"
              disabled={!pretAEnvoyer || isPending}
              onClick={envoyer}
            >
              <Send className="size-4" />
              {isPending ? "Envoi..." : `Envoyer aux ${panier.lignes.length} professionnels`}
            </Button>
            <p className="mt-3 text-[12px] leading-[1.55] text-ppj-text-4">
              Chaque professionnel reçoit uniquement les informations de son métier, et vous renvoie son propre devis.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const champInputClass =
  "w-full rounded-[13px] border border-ppj-line-field bg-ppj-field px-3.5 py-3 text-[14.5px] text-ppj-ink placeholder:text-ppj-text-4 focus:outline-none";

function heuresDuree(debut: string, fin: string): number {
  const [h1, m1] = debut.split(":").map(Number);
  const [h2, m2] = fin.split(":").map(Number);
  let minutes = h2 * 60 + m2 - (h1 * 60 + m1);
  if (minutes <= 0) minutes += 24 * 60;
  return Math.round((minutes / 60) * 10) / 10;
}

function inputHoraireClass(manquant: boolean) {
  return manquant
    ? "flex-1 rounded-[11px] border-[1.5px] border-primary bg-white px-3 py-[9px] text-[14px] text-ppj-ink focus:outline-none"
    : "flex-1 rounded-[11px] border border-ppj-line-field bg-ppj-field px-3 py-[10px] text-[14px] text-ppj-ink focus:outline-none";
}

/**
 * Pastille d'onglet métier — README §11 : 6px, rouge #E21D1B si
 * incomplet, vert #2E7D4F si prêt ; #FF8A85 (rouge clair) quand
 * l'onglet est actif, pour rester lisible sur le fond noir. Onglet
 * actif : fond #1A1917, texte #FBFAF8.
 */
function Onglets({ actif, complet, onClick, label }: { actif: boolean; complet: boolean; onClick: () => void; label: string }) {
  const couleurPastille = actif ? "#FF8A85" : complet ? "#2E7D4F" : "#E21D1B";
  return (
    <button
      type="button"
      role="tab"
      aria-selected={actif}
      onClick={onClick}
      className={cn(
        "flex min-h-11 items-center gap-1.5 rounded-[11px] px-3 py-2 text-[13px] font-medium transition-colors",
        actif ? "bg-[#1A1917] text-[#FBFAF8]" : "border border-ppj-line bg-white text-ppj-ink hover:border-ppj-ink",
      )}
    >
      <span className="block size-[6px] shrink-0 rounded-full" style={{ backgroundColor: couleurPastille }} />
      {label}
    </button>
  );
}

function ChampSaisie({
  label,
  reconnu,
  reconnuDetail,
  manquant,
  optionnel,
  children,
}: {
  label: string;
  reconnu?: boolean;
  reconnuDetail?: string;
  manquant?: boolean;
  optionnel?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="mb-1.5 flex items-center gap-2 text-[12.5px] font-semibold text-ppj-ink">
        {label}
        {manquant && <BadgeManquant>requis</BadgeManquant>}
        {!manquant && reconnu && <Badge>{reconnuDetail ?? "reconnu"}</Badge>}
        {!manquant && !reconnu && optionnel && <span className="font-normal text-ppj-text-4">optionnel</span>}
      </span>
      {children}
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-ppj-red-border bg-ppj-red-bg px-2 py-[3px] text-[12px] text-ppj-red-text">{children}</span>
  );
}

function BadgeManquant({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-primary px-2 py-[3px] text-[12px] text-white">{children}</span>;
}

function Check() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function Dot() {
  return <span className="block size-[15px] flex-none rounded-full border-[1.5px] border-primary" />;
}
