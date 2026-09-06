import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Lecture de la mesure d'audience réelle (table `visites`, migration
 * 0046) — posée pour remplacer les tuiles "non mesuré" du back-office
 * dès que du trafic existe. Tant que la table est vide (avant la
 * migration, ou juste après), chaque fonction retourne des zéros /
 * listes vides plutôt que d'échouer — la tuile affiche alors "0"
 * plutôt qu'une valeur inventée, et se remplit d'elle-même au fil de
 * la navigation réelle des visiteurs consentants.
 */

export type ActiviteTempsReel = {
  visiteursActifs: number;
  pagesPlusVues: { chemin: string; nb: number }[];
};

export async function getActiviteTempsReel(): Promise<ActiviteTempsReel> {
  const admin = createAdminClient();
  const depuis = new Date(Date.now() - 5 * 60_000).toISOString();
  const { data } = await admin.from("visites").select("chemin, session_id").gte("created_at", depuis);
  const lignes = data ?? [];

  const compteur = new Map<string, number>();
  for (const l of lignes) compteur.set(l.chemin, (compteur.get(l.chemin) ?? 0) + 1);

  return {
    visiteursActifs: new Set(lignes.map((l) => l.session_id)).size,
    pagesPlusVues: [...compteur.entries()].map(([chemin, nb]) => ({ chemin, nb })).sort((a, b) => b.nb - a.nb).slice(0, 5),
  };
}

export type JourFrequentation = { jour: string; nb: number; estAujourdhui: boolean };

/** 14 barres verticales (§5.1) — une par jour, dont aujourd'hui en dernier. */
export async function getFrequentation14j(): Promise<JourFrequentation[]> {
  const admin = createAdminClient();
  const depuis = new Date();
  depuis.setDate(depuis.getDate() - 13);
  depuis.setHours(0, 0, 0, 0);
  const { data } = await admin.from("visites").select("created_at").gte("created_at", depuis.toISOString());

  const compteur = new Map<string, number>();
  for (const v of data ?? []) {
    const cle = new Date(v.created_at).toISOString().slice(0, 10);
    compteur.set(cle, (compteur.get(cle) ?? 0) + 1);
  }

  const jours: JourFrequentation[] = [];
  const aujourdhui = new Date().toISOString().slice(0, 10);
  for (let i = 0; i < 14; i++) {
    const d = new Date(depuis);
    d.setDate(d.getDate() + i);
    const cle = d.toISOString().slice(0, 10);
    jours.push({
      jour: d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
      nb: compteur.get(cle) ?? 0,
      estAujourdhui: cle === aujourdhui,
    });
  }
  return jours;
}

export type StatsLive = { visiteursActifs: number; pagesVuesParMin: number; partMobile: number | null; nouveaux: number };

export async function getStatsLive(): Promise<StatsLive> {
  const admin = createAdminClient();
  const depuis5min = new Date(Date.now() - 5 * 60_000).toISOString();
  const debutJour = new Date();
  debutJour.setHours(0, 0, 0, 0);

  const [{ data: recentes }, { data: duJour }] = await Promise.all([
    admin.from("visites").select("session_id, appareil").gte("created_at", depuis5min),
    admin.from("visites").select("session_id, created_at").gte("created_at", debutJour.toISOString()).order("created_at", { ascending: true }),
  ]);
  const lignesRecentes = recentes ?? [];
  const mobiles = lignesRecentes.filter((l) => l.appareil === "mobile").length;

  const premiereVueParSession = new Map<string, string>();
  for (const l of duJour ?? []) {
    if (!premiereVueParSession.has(l.session_id)) premiereVueParSession.set(l.session_id, l.created_at);
  }
  const nouveaux = [...premiereVueParSession.values()].filter((t) => new Date(t).getTime() > Date.now() - 30 * 60_000).length;

  return {
    visiteursActifs: new Set(lignesRecentes.map((l) => l.session_id)).size,
    pagesVuesParMin: Math.round((lignesRecentes.length / 5) * 10) / 10,
    partMobile: lignesRecentes.length > 0 ? Math.round((mobiles / lignesRecentes.length) * 1000) / 10 : null,
    nouveaux,
  };
}

export type StatsHistorique = {
  visiteurs30j: number;
  sessionsParVisiteur: number | null;
  dureeMoyenneSecondes: number | null;
  tauxRebond: number | null;
};

export async function getStatsHistorique30j(): Promise<StatsHistorique> {
  const admin = createAdminClient();
  const depuis = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data } = await admin.from("visites").select("session_id, created_at").gte("created_at", depuis).order("created_at", { ascending: true });
  const lignes = data ?? [];
  if (lignes.length === 0) return { visiteurs30j: 0, sessionsParVisiteur: null, dureeMoyenneSecondes: null, tauxRebond: null };

  const parSession = new Map<string, string[]>();
  for (const l of lignes) parSession.set(l.session_id, [...(parSession.get(l.session_id) ?? []), l.created_at]);

  const sessions = [...parSession.values()];
  const durees = sessions.map((horodatages) => (new Date(horodatages[horodatages.length - 1]).getTime() - new Date(horodatages[0]).getTime()) / 1000);
  const rebonds = sessions.filter((h) => h.length === 1).length;

  return {
    visiteurs30j: sessions.length,
    sessionsParVisiteur: Math.round((lignes.length / sessions.length) * 10) / 10,
    dureeMoyenneSecondes: Math.round(durees.reduce((s, d) => s + d, 0) / durees.length),
    tauxRebond: Math.round((rebonds / sessions.length) * 1000) / 10,
  };
}

export type EtapesVisites = { visites: number; recherches: number };

/** Alimente les deux premiers étages de l'entonnoir Insights → Direction (§5.10), réels dès que `visites` a des lignes. */
export async function getVisitesEtRecherches(): Promise<EtapesVisites> {
  const admin = createAdminClient();
  const { data } = await admin.from("visites").select("session_id, chemin");
  const lignes = data ?? [];
  const visites = new Set(lignes.map((l) => l.session_id)).size;
  const recherches = new Set(lignes.filter((l) => l.chemin.startsWith("/prestataires")).map((l) => l.session_id)).size;
  return { visites, recherches };
}
