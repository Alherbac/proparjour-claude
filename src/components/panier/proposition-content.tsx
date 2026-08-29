"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdresseAutocomplete } from "@/components/adresse-autocomplete";
import { METIERS, type MetierId } from "@/config/metiers";
import { usePanier } from "@/hooks/use-panier";
import { viderPanier } from "@/lib/panier";
import { extraireBesoin, detecterAdresse, extraireSousBesoins } from "@/lib/besoin";
import { proposerMission, type LigneProposition } from "@/app/actions/proposition";

type ChampsMetier = {
  heureDebut: string;
  heureFin: string;
  precisions: string;
  reconnuHoraires: boolean;
};

/**
 * "proparjour 6-7" §9 — écran de passage entre le panier et l'envoi
 * réel : deux colonnes, commun saisi une fois, un bloc par métier
 * (les horaires ne sont JAMAIS communs, voir README) — réutilise tel
 * quel le moteur de compréhension du besoin (lib/besoin.ts, Lots A-D)
 * pour le pré-remplissage, jamais un second moteur. Envoie une seule
 * mission avec toutes les lignes 'en_attente' (actions/proposition.ts)
 * — rien n'est payé ici, le paiement n'intervient qu'à l'acceptation
 * d'un professionnel (carte de devis existante en messagerie).
 */
export function PropositionContent() {
  const router = useRouter();
  const panier = usePanier();
  const [isPending, startTransition] = useTransition();

  const [phrase, setPhrase] = useState("");
  const [analyse, setAnalyse] = useState(false);

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

  const [champsParMetier, setChampsParMetier] = useState<Partial<Record<MetierId, ChampsMetier>>>({});

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

  const champsCommunTotal = 3; // date, adresse, contexte
  const champsCommunRemplis = (dateReconnue ? 1 : 0) + (villeReconnue ? 1 : 0) + (contexteReconnu ? 1 : 0);
  const champsHorairesTotal = metiersRetenus.length;
  const champsHorairesRemplis = metiersRetenus.filter((m) => champs(m.id).reconnuHoraires).length;
  const totalChamps = champsCommunTotal + champsHorairesTotal;
  const totalRemplis = champsCommunRemplis + champsHorairesRemplis;

  const manques: string[] = [];
  if (!date) manques.push("Date de la mission");
  if (!adresse.trim()) manques.push("Adresse exacte");
  for (const m of metiersRetenus) {
    const c = champs(m.id);
    if (!c.heureDebut || !c.heureFin) manques.push(`${m.label} — horaires`);
  }

  const pretAEnvoyer = titre.trim().length > 0 && date.length > 0 && adresse.trim().length > 0 && manques.length === 0;

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
    <div className="mx-auto max-w-[1180px] px-4 py-8 lg:px-8">
      <Link href="/panier" className="text-[13px] text-ppj-text-3 hover:text-ppj-ink">
        ← Retour au panier
      </Link>
      <h1
        className="mt-2.5 text-ppj-ink"
        style={{ fontFamily: "var(--font-display-serif)", fontSize: "29px", lineHeight: 1.1, letterSpacing: "-0.018em" }}
      >
        Détails de la mission
      </h1>
      <p className="mt-1.5 text-[13.5px] text-ppj-text-2">
        {panier.lignes.length} professionnel{panier.lignes.length > 1 ? "s" : ""} retenu{panier.lignes.length > 1 ? "s" : ""} ·{" "}
        {metiersRetenus.length} métier{metiersRetenus.length > 1 ? "s" : ""} · rien n&apos;est encore envoyé
      </p>

      <div
        className="mt-6 grid items-start gap-0 overflow-hidden rounded-[22px] border border-ppj-line bg-white"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(360px, 100%), 1fr))" }}
      >
        {/* Colonne gauche */}
        <div className="min-w-0 border-r border-ppj-line-2 p-6 [&>div:last-child]:border-r-0 lg:[&]:border-r">
          <div className="mb-5 rounded-[13px] border border-ppj-red-border bg-ppj-red-bg p-[13px_15px]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] font-semibold text-ppj-red-text">Pré-rempli d&apos;après votre phrase</span>
              {analyse && (
                <span className="ml-auto text-[12px] text-ppj-red-text">
                  {totalRemplis} / {totalChamps}
                </span>
              )}
            </div>
            <textarea
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              onBlur={analyserPhrase}
              rows={2}
              placeholder="Décrivez votre besoin en une phrase (optionnel) — « vendredi à Paris, de 18h à minuit »…"
              className="mt-2.5 w-full resize-none rounded-[10px] border border-ppj-red-border bg-white px-3 py-2 text-[13px] text-ppj-ink placeholder:text-ppj-text-4 focus:outline-none"
            />
          </div>

          <div className="mb-[18px] rounded-[18px] border border-ppj-line bg-white p-[18px]">
            <div className="mb-[15px] flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ppj-text-5">Commun à toute la mission</span>
            </div>
            <div className="grid gap-[11px]">
              <div>
                <span className="mb-1.5 block text-[12.5px] font-semibold text-ppj-ink">Titre de la mission</span>
                <input
                  value={titre}
                  onChange={(e) => setTitre(e.target.value)}
                  placeholder="Ex. Soirée d'inauguration — 28 août"
                  className="w-full rounded-[13px] border border-ppj-line-field bg-ppj-field px-3.5 py-3 text-[14.5px] text-ppj-ink placeholder:text-ppj-text-4 focus:outline-none"
                />
              </div>
              <ChampCommun
                label="Date"
                reconnu={dateReconnue}
                manquant={!date}
              >
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setDateReconnue(false);
                  }}
                  className="w-full bg-transparent text-[14.5px] text-ppj-ink focus:outline-none"
                />
              </ChampCommun>
              <ChampCommun
                label="Adresse exacte"
                reconnu={Boolean(villeReconnue)}
                reconnuDetail={villeReconnue ? `« ${villeReconnue} » reconnu` : undefined}
                manquant={!adresse.trim()}
              >
                <AdresseAutocomplete
                  id="adresse-proposition"
                  value={adresse}
                  onChange={(v) => {
                    setAdresse(v);
                  }}
                  placeholder="Numéro, rue, code postal"
                />
              </ChampCommun>
              <div>
                <span className="mb-1.5 flex items-center gap-2 text-[12.5px] font-semibold text-ppj-ink">
                  Contexte de la mission
                  {contexteReconnu && <Badge>reconnu</Badge>}
                </span>
                <textarea
                  value={contexte}
                  onChange={(e) => {
                    setContexte(e.target.value);
                    setContexteReconnu(false);
                  }}
                  rows={2}
                  placeholder="Type d'événement, nombre d'invités attendus…"
                  className="w-full resize-none rounded-[13px] border border-ppj-line-field bg-ppj-field px-3.5 py-3 text-[14px] leading-[1.5] text-ppj-ink placeholder:text-ppj-text-4 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="mb-3 flex items-center gap-2.5">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ppj-text-5">Propre à chaque métier</span>
            <span className="h-px flex-1 bg-ppj-line-2" />
          </div>

          <div className="grid gap-3">
            {metiersRetenus.map((m) => {
              const c = champs(m.id);
              const nb = panier.lignes.filter((l) => l.metier === m.id).length;
              const autreAvecHoraires = metiersRetenus.find(
                (autre) => autre.id !== m.id && champs(autre.id).heureDebut && champs(autre.id).heureFin,
              );
              return (
                <div key={m.id} className="overflow-hidden rounded-[18px] border border-ppj-line bg-white">
                  <div className="flex flex-wrap items-center gap-[11px] border-b border-ppj-line-2 px-[17px] py-[15px]">
                    <span
                      className="grid size-[30px] flex-none place-items-center rounded-[9px] border border-ppj-red-border bg-ppj-red-bg text-[14px] text-primary"
                      style={{ fontFamily: "var(--font-display-serif)" }}
                    >
                      {m.label.charAt(0)}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[14.5px] font-semibold text-ppj-ink">{m.label}</span>
                      <span className="mt-0.5 block text-[11.5px] text-ppj-text-3">
                        {nb} candidat{nb > 1 ? "s" : ""} retenu{nb > 1 ? "s" : ""}
                      </span>
                    </span>
                  </div>
                  <div className="grid gap-3 px-[17px] py-4">
                    <div>
                      <span className="mb-1.5 flex items-center gap-2 text-[12.5px] font-semibold text-ppj-ink">
                        Horaires de ce poste
                        {c.reconnuHoraires ? (
                          <Badge>reconnu</Badge>
                        ) : !c.heureDebut || !c.heureFin ? (
                          <BadgeManquant>à compléter</BadgeManquant>
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
                          className="mt-2 rounded-full border border-ppj-line bg-ppj-fill px-2.5 py-[5px] text-[11.5px] text-ppj-neutral-text hover:border-ppj-ink"
                        >
                          Comme {autreAvecHoraires.label} ({champs(autreAvecHoraires.id).heureDebut} → {champs(autreAvecHoraires.id).heureFin})
                        </button>
                      )}
                    </div>
                    <div>
                      <span className="mb-1.5 block text-[12.5px] font-semibold text-ppj-ink">
                        Précisions pour ce métier <span className="font-normal text-ppj-text-4">(tenue, qualifications, missions confiées…)</span>
                      </span>
                      <textarea
                        value={c.precisions}
                        onChange={(e) =>
                          setChampsParMetier((prev) => ({ ...prev, [m.id]: { ...champs(m.id), precisions: e.target.value } }))
                        }
                        rows={2}
                        placeholder="Ex. costume sombre, contrôle d'accès, oreillette fournie…"
                        className="w-full resize-none rounded-[11px] border border-ppj-line-field bg-ppj-field px-3 py-2.5 text-[13.5px] text-ppj-ink placeholder:text-ppj-text-4 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Colonne droite */}
        <div className="min-w-0 bg-ppj-paper p-6">
          <div className="rounded-[18px] border border-ppj-line bg-white p-[18px]">
            <div className="mb-3.5 flex items-center gap-2">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ppj-text-5">Professionnels retenus</span>
              <span className="ml-auto text-[11.5px] text-ppj-text-3">{panier.lignes.length}</span>
            </div>
            <div className="grid gap-3.5">
              {metiersRetenus.map((m) => (
                <div key={m.id}>
                  <span className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-ppj-text-2">
                    <span
                      className="grid size-5 flex-none place-items-center rounded-[6px] border border-ppj-red-border bg-ppj-red-bg text-[11px] text-primary"
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
                          <div key={`${l.prestataireId}-${i}`} className="flex items-center gap-2.5 rounded-xl border border-ppj-line-2 px-2.5 py-[9px]">
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
                              <span className="mt-0.5 block text-[11.5px] text-ppj-text-3">
                                {l.tarifMontant} € / {l.tarifType === "horaire" ? "heure" : "jour"}
                                {c.heureDebut && c.heureFin ? ` · ${c.heureDebut} → ${c.heureFin}` : ""}
                              </span>
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3.5 rounded-[18px] border border-ppj-line bg-white p-[18px]">
            <p className="mb-3 text-[13.5px] font-semibold text-ppj-ink">Avant l&apos;envoi</p>
            {manques.length === 0 ? (
              <p className="flex items-center gap-2 text-[13px] text-ppj-ink">
                <Check /> Tout est prêt
              </p>
            ) : (
              <div className="grid gap-2.5">
                {manques.map((m) => (
                  <span key={m} className="flex items-center gap-2.5 text-[13px] font-semibold text-ppj-red-text">
                    <Dot /> {m}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mt-3.5 rounded-[18px] border border-ppj-line bg-white p-[18px]">
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

function ChampCommun({
  label,
  reconnu,
  reconnuDetail,
  manquant,
  children,
}: {
  label: string;
  reconnu: boolean;
  reconnuDetail?: string;
  manquant: boolean;
  children: React.ReactNode;
}) {
  if (manquant) {
    return (
      <div className="rounded-[13px] border-[1.5px] border-primary bg-white px-3.5 py-3">
        <span className="mb-1.5 flex items-center gap-2 text-[12.5px] font-semibold text-ppj-red-text">
          {label}
          {reconnuDetail && <span className="ml-auto text-[11px] font-normal text-ppj-red-text">{reconnuDetail}</span>}
        </span>
        {children}
      </div>
    );
  }
  return (
    <div>
      <span className="mb-1.5 flex items-center gap-2 text-[12.5px] font-semibold text-ppj-ink">
        {label}
        {reconnu && <Badge>reconnu</Badge>}
      </span>
      <div className="rounded-[13px] border border-ppj-line-field bg-ppj-field px-3.5 py-3">{children}</div>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-ppj-red-border bg-ppj-red-bg px-2 py-[3px] text-[10.5px] text-ppj-red-text">{children}</span>
  );
}

function BadgeManquant({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-primary px-2 py-[3px] text-[10.5px] text-white">{children}</span>;
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
