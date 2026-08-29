"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { verifierLimiteDebit, ipRequete } from "@/lib/rate-limit";

/** Déconnexion — utilisée directement comme action de formulaire (`<form action={signOutAction}>`) dans les layouts admin et tableau de bord. */
export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/connexion");
}

const MAX_TENTATIVES = 8;
const FENETRE_SECONDES = 5 * 60;

/**
 * Garde de débit, appelée juste AVANT signInWithPassword côté
 * navigateur (connexion-form.tsx) — ne fait que vérifier/incrémenter
 * les compteurs, ne touche jamais à l'authentification elle-même.
 *
 * `supabase.auth.signInWithPassword` reste côté client à dessein :
 * en le faisant tourner côté serveur via le client SSR
 * (@supabase/ssr 0.12.4, createServerClient), un test en direct a
 * mesuré un blocage d'environ 27 secondes avant que l'appel
 * n'aboutisse — reproduit hors Next.js, dans un script Node isolé
 * utilisant le même client, donc pas un problème propre à ce projet
 * mais à cette version de la librairie. Le client navigateur
 * (createBrowserClient, jamais concerné) répond, lui, normalement.
 * Limiter le débit sans faire tourner l'authentification côté
 * serveur est donc le compromis retenu, pas un renoncement : il
 * couvre exactement le même risque (credential stuffing) sans hériter
 * du bug.
 */
export async function verifierLimiteConnexion(email: string): Promise<{ autorise: boolean; erreur?: string }> {
  const ip = await ipRequete();
  const [okIp, okEmail] = await Promise.all([
    verifierLimiteDebit(`connexion:ip:${ip}`, MAX_TENTATIVES, FENETRE_SECONDES),
    verifierLimiteDebit(`connexion:email:${email.trim().toLowerCase()}`, MAX_TENTATIVES, FENETRE_SECONDES),
  ]);
  if (!okIp || !okEmail) {
    return { autorise: false, erreur: "Trop de tentatives. Réessayez dans quelques minutes." };
  }
  return { autorise: true };
}
