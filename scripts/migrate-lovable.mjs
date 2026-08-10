#!/usr/bin/env node
/**
 * Migration des comptes de l'ancien site (Lovable Cloud) vers ce
 * projet Supabase — voir /Users/diallocherif/.claude/plans/spicy-crunching-iverson.md
 * pour le plan complet et la justification de chaque choix de mapping.
 *
 * Usage :
 *   node scripts/migrate-lovable.mjs                 # dry-run (aucune écriture)
 *   node scripts/migrate-lovable.mjs --write          # écrit réellement en base + storage
 *
 * Données attendues dans ./migration-data/ (jamais commité, voir .gitignore) :
 *   profiles.json            — export de la table `profiles`
 *   user_roles.json          — export de `user_roles` ({user_id, role})
 *   provider_documents.json  — export de `provider_documents`
 *   provider_formations.json — export de `provider_formations`
 *   provider_skills.json     — export de `provider_skills`
 *   auth_users.json          — export de `auth.users`, UNIQUEMENT {id, email, created_at}
 *   storage_manifest.json    — liste des fichiers des buckets (bucket, path, created_at) ;
 *     sert à retrouver l'avatar de chaque profil sans ambiguïté
 *   avatars/{path exact du manifeste}    — fichiers téléchargés du bucket `avatars`
 *   documents/{path exact = storage_path dans provider_documents} — fichiers du bucket `documents`
 *
 * Ce script n'envoie AUCUN e-mail — voir scripts/activer-comptes-migres.mjs,
 * à lancer séparément et volontairement le jour de la mise en production.
 */

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "migration-data");
const WRITE = process.argv.includes("--write");

// `node` ne charge pas .env.local automatiquement (contrairement à Next.js).
const envLocalPath = path.join(ROOT, ".env.local");
if (fs.existsSync(envLocalPath)) {
  for (const line of fs.readFileSync(envLocalPath, "utf8").split("\n")) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim();
    }
  }
}

function readJson(filename) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.error(`Fichier manquant : ${filePath}`);
    console.error(`Place l'export Lovable dans ${DATA_DIR}/ avant de relancer.`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function envOrDie(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Variable d'environnement manquante : ${name} (voir .env.local)`);
    process.exit(1);
  }
  return value;
}

const supabaseUrl = envOrDie("NEXT_PUBLIC_SUPABASE_URL");
const serviceRoleKey = envOrDie("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ============================================================
// Mapping — voir le plan pour la justification de chaque choix
// ============================================================

const PROFESSION_TO_METIER = {
  security_agent: "securite",
  receptionist: "accueil",
  cashier: "vente",
};

// Décision du 2026-08-07 : comptes de test/essai identifiés par le
// fondateur, à exclure explicitement de la migration (pas de vraies
// personnes concernées).
const EXCLUDED_USER_IDS = new Set([
  "dc313a0b-2c30-4799-9653-233512dcf8a4", // monicarocha18@outlook.fr — Monica ROCHA DELGADO
  "9d083dc0-6296-495a-bbf3-6aa3c0473f0b", // socsociete@gmail.com — "Essai Société"
  "76e5a414-5b7a-4cbd-b3e3-bb9951908ff9", // jeudi@gmail.com — DIALLO ESSAI
  "f9d9dce7-32b2-4695-aca2-896d7b25ca55", // cherifzaila@gmail.com — Oumar Diallo
  "6f5cc2ef-d4ad-4766-b1cb-8530c1538bc3", // werekou@gmail.com — Nouveau Test
  "d4827b0e-50f7-4e7d-bcb4-f220b1f43d7a", // diallozaila@gmail.com — Cherif Diallo
  "700c5991-672e-4d0b-861c-e6bd71cdc0d3", // mamagaoh20@gmail.com — Encore Test
  "e99af654-78ff-4257-a92e-f0ff5854b61d", // dialloassta@gmail.com — Assta Diallo
]);

const DOCUMENT_TYPE_MAP = {
  cnaps: "carte_cnaps",
};

function mapValidationStatus(status) {
  if (status === "validated" || status === "approved_partial") return "valide";
  if (status === "rejected") return "refuse";
  // pending, awaiting_modifications, partial, suspended → conservateur
  return "en_attente";
}

function mapTarif(profile) {
  if (profile.daily_rate != null) return { tarif_type: "journalier", tarif_montant: Number(profile.daily_rate) };
  if (profile.hourly_rate != null) return { tarif_type: "horaire", tarif_montant: Number(profile.hourly_rate) };
  return null;
}

function mapStatutIndependant(profile) {
  const siret = (profile.siret ?? profile.company_siret ?? "").replace(/\s/g, "");
  const siren = profile.siren ?? "";
  return siret || siren ? "societe" : "auto_entrepreneur";
}

function cleanSiret(raw) {
  const digits = (raw ?? "").replace(/\D/g, "");
  return /^\d{14}$/.test(digits) ? digits : null;
}

/**
 * Le manifeste storage_manifest.json (bucket/path/created_at exacts)
 * est bien plus fiable qu'une recherche par préfixe de nom de fichier
 * — un avatar est toujours à `{user_id}/....`, donc un préfixe seul
 * pointerait vers un dossier, pas un fichier.
 */
function buildAvatarIndex(storageManifest) {
  const byUserId = new Map();
  for (const entry of storageManifest) {
    if (entry.bucket !== "avatars") continue;
    const userId = entry.path.split("/")[0];
    const existing = byUserId.get(userId);
    if (!existing || entry.created_at > existing.created_at) {
      byUserId.set(userId, entry);
    }
  }
  return byUserId;
}

async function uploadFile(bucket, storagePath, localPath) {
  const buffer = fs.readFileSync(localPath);
  const { error } = await supabase.storage.from(bucket).upload(storagePath, buffer, {
    upsert: true,
  });
  if (error) throw new Error(`Upload ${bucket}/${storagePath} : ${error.message}`);
  if (bucket === "avatars") {
    return supabase.storage.from(bucket).getPublicUrl(storagePath).data.publicUrl;
  }
  return storagePath;
}

// ============================================================
// Exécution
// ============================================================

async function main() {
  const profiles = readJson("profiles.json");
  const userRoles = readJson("user_roles.json");
  const documents = readJson("provider_documents.json");
  const formationsSource = readJson("provider_formations.json");
  const skills = readJson("provider_skills.json");
  const authUsers = readJson("auth_users.json");
  const storageManifest = fs.existsSync(path.join(DATA_DIR, "storage_manifest.json"))
    ? readJson("storage_manifest.json")
    : [];

  const roleByUserId = new Map(userRoles.map((r) => [r.user_id, r.role]));
  const authByUserId = new Map(authUsers.map((u) => [u.id, u]));
  const documentsByUserId = groupBy(documents, "user_id");
  const formationsByUserId = groupBy(formationsSource, "user_id");
  const skillsByUserId = groupBy(skills, "user_id");
  const avatarByUserId = buildAvatarIndex(storageManifest);

  const report = { importes: [], ignores: [], erreurs: [] };

  console.log(`Mode : ${WRITE ? "ÉCRITURE RÉELLE" : "DRY-RUN (aucune écriture)"}`);
  console.log(`${profiles.length} profils trouvés dans l'export.\n`);

  for (const profile of profiles) {
    const userId = profile.user_id;
    const email = authByUserId.get(userId)?.email;
    const role = roleByUserId.get(userId);

    if (EXCLUDED_USER_IDS.has(userId)) {
      report.ignores.push({ userId, email, raison: "compte de test/essai exclu explicitement" });
      continue;
    }
    if (!email) {
      report.ignores.push({
        userId,
        raison: "email introuvable dans auth_users.json — à revérifier précisément avec Lovable, sans e-mail impossible de créer un compte de connexion",
      });
      continue;
    }
    if (role === "admin") {
      report.ignores.push({ userId, email, raison: "compte admin — migration manuelle recommandée" });
      continue;
    }

    // Décision du 2026-08-07 : "je ne veux perdre personne". Si aucune
    // ligne user_roles n'existe, on déduit le rôle des champs remplis
    // plutôt que d'ignorer le profil.
    let roleEffectif = role;
    if (!roleEffectif) {
      if (profile.company_name) roleEffectif = "company";
      else if (profile.profession) roleEffectif = "provider";
    }

    try {
      if (roleEffectif === "provider") {
        await migrerPrestataire({ profile, userId, email, report });
      } else if (roleEffectif === "company") {
        await migrerRecruteur({ profile, userId, email, report });
      } else {
        await migrerCompteVide({ profile, userId, email, report });
      }
    } catch (err) {
      report.erreurs.push({ userId, email, erreur: err.message });
    }
  }

  imprimerRapport(report);

  function groupBy(rows, key) {
    const map = new Map();
    for (const row of rows) {
      const k = row[key];
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(row);
    }
    return map;
  }

  async function creerAuthUser(userId, email) {
    if (!WRITE) return;
    const { error } = await supabase.auth.admin.createUser({
      id: userId,
      email,
      email_confirm: true,
      // Pas de `password` : aucun mot de passe utilisable n'est défini ici.
      // L'utilisateur en choisit un via scripts/activer-comptes-migres.mjs,
      // lancé séparément à la mise en production.
      user_metadata: { migre_depuis: "lovable" },
    });
    if (error && !error.message.includes("already been registered")) throw error;
  }

  async function migrerPrestataire({ profile, userId, email, report }) {
    await creerAuthUser(userId, email);

    if (WRITE) {
      const { error: userError } = await supabase.from("users").upsert({
        id: userId,
        type: "prestataire",
        prenom: profile.first_name,
        nom: profile.last_name,
        telephone: profile.phone,
        ville: profile.city,
      });
      if (userError) throw userError;
    }

    // Métier jamais renseigné sur l'ancien site : impossible de fabriquer
    // une valeur sans mentir sur la spécialité de la personne — on garde
    // juste le compte (créé ci-dessus), sans ligne prestataires_profils.
    // Elle choisira son métier en se reconnectant, comme n'importe quelle
    // nouvelle inscription.
    const metier = PROFESSION_TO_METIER[profile.profession];
    if (!metier) {
      report.importes.push({
        userId,
        email,
        type: "prestataire (métier à choisir à la reconnexion)",
      });
      return;
    }

    // Décision explicite : un profil sans tarif, sans ville ou sans photo
    // est quand même importé (pas d'e-mail perdu, pas de ré-inscription à
    // refaire), mais forcé "en attente" pour repasser par la file
    // d'admin — c'est depuis cette file que l'admin recontacte la
    // personne pour lui demander de compléter ce qui manque. La
    // détection d'une photo "non identifiable" (floue, logo, etc.) n'est
    // PAS automatisée ici — ça reste un jugement humain fait par l'admin
    // au moment de la validation, comme pour n'importe quel nouveau profil.
    const tarif = mapTarif(profile) ?? { tarif_type: "journalier", tarif_montant: 1 };
    const tarifPlaceholder = !mapTarif(profile);
    const ville = profile.city || "À renseigner";
    const villePlaceholder = !profile.city;
    const avatarEntry = avatarByUserId.get(userId);
    const photoManquante = !avatarEntry;

    const statutVerification =
      tarifPlaceholder || villePlaceholder || photoManquante
        ? "en_attente"
        : mapValidationStatus(profile.validation_status);
    const visible = profile.validation_status !== "suspended" && (profile.is_available ?? true);
    const competences = (skillsByUserId.get(userId) ?? []).map((s) => s.skill_name);

    let photoUrl = null;
    const avatarFile = avatarEntry ? path.join(DATA_DIR, "avatars", avatarEntry.path) : null;
    const avatarFileExists = avatarFile && fs.existsSync(avatarFile);
    if (avatarFileExists && WRITE) {
      const ext = path.extname(avatarFile) || ".jpg";
      photoUrl = await uploadFile("avatars", `${userId}/profile${ext}`, avatarFile);
    }

    let prestataireId = null;
    if (WRITE) {
      const { data, error } = await supabase
        .from("prestataires_profils")
        .upsert(
          {
            user_id: userId,
            metier,
            statut_independant: mapStatutIndependant(profile),
            numero_carte_cnaps: profile.cnaps_number ?? null,
            certifications: [],
            competences,
            langues: profile.languages_spoken ?? [],
            bio: profile.bio ?? null,
            ville,
            tarif_type: tarif.tarif_type,
            tarif_montant: tarif.tarif_montant,
            disponibilites: [],
            photo_url: photoUrl,
            statut_verification: statutVerification,
            visible,
          },
          { onConflict: "user_id" },
        )
        .select("id")
        .single();
      if (error) throw error;
      prestataireId = data.id;
    }

    // Formations
    const formationsPrestataire = formationsByUserId.get(userId) ?? [];
    if (WRITE && prestataireId) {
      for (const f of formationsPrestataire) {
        const { error } = await supabase.from("prestataires_formations").insert({
          prestataire_id: prestataireId,
          etablissement: f.institution_name,
          diplome: f.diploma_name,
          annee_obtention: f.graduation_year ?? null,
          description: f.description ?? null,
        });
        if (error) throw error;
      }
    }

    // Documents
    const documentsPrestataire = documentsByUserId.get(userId) ?? [];
    let documentsImportes = 0;
    for (const doc of documentsPrestataire) {
      const localFile = path.join(DATA_DIR, "documents", doc.storage_path ?? "");
      if (!fs.existsSync(localFile)) continue;
      if (WRITE && prestataireId) {
        const typeDocument = DOCUMENT_TYPE_MAP[doc.document_type] ?? doc.document_type;
        const ext = path.extname(localFile) || ".pdf";
        const storagePath = `${userId}/${typeDocument}-${Date.now()}${ext}`;
        await uploadFile("justificatifs", storagePath, localFile);
        const { error } = await supabase.from("justificatifs").insert({
          prestataire_id: prestataireId,
          type_document: typeDocument,
          storage_path: storagePath,
          statut: doc.is_verified ? "valide" : "en_attente",
          reviewed_at: doc.verified_at ?? null,
        });
        if (error) throw error;
      }
      documentsImportes += 1;
    }

    report.importes.push({
      userId,
      email,
      type: "prestataire",
      metier,
      statutVerification,
      tarifPlaceholder,
      villePlaceholder,
      photoManquante,
      photoFichierPresent: Boolean(avatarFileExists),
      formations: formationsPrestataire.length,
      competences: competences.length,
      documents: documentsImportes,
    });
  }

  async function migrerCompteVide({ profile, userId, email, report }) {
    // Ni métier ni entreprise identifiable : on garde le compte
    // (e-mail, nom si connu) sans lui inventer un rôle. La personne
    // choisira "je recrute" / "je propose mes services" via /inscription
    // en se reconnectant — exactement le parcours d'une inscription neuve.
    await creerAuthUser(userId, email);
    if (WRITE) {
      const { error } = await supabase.from("users").upsert({
        id: userId,
        type: null,
        prenom: profile.first_name ?? null,
        nom: profile.last_name ?? null,
        telephone: profile.phone ?? null,
        ville: profile.city ?? null,
      });
      if (error) throw error;
    }
    report.importes.push({ userId, email, type: "compte (rôle à choisir à la reconnexion)" });
  }

  async function migrerRecruteur({ profile, userId, email, report }) {
    await creerAuthUser(userId, email);

    const siret = cleanSiret(profile.company_siret);
    const type = siret ? "recruteur_entreprise" : "recruteur_particulier";

    if (WRITE) {
      const { error: userError } = await supabase.from("users").upsert({
        id: userId,
        type,
        prenom: profile.first_name,
        nom: profile.last_name,
        telephone: profile.phone,
        ville: profile.city,
      });
      if (userError) throw userError;

      if (siret) {
        const { error } = await supabase.from("entreprises").upsert(
          {
            user_id: userId,
            raison_sociale: profile.company_name ?? "—",
            siret,
            secteur_activite: profile.company_description ?? "Non renseigné",
          },
          { onConflict: "user_id" },
        );
        if (error) throw error;
      }
    }

    report.importes.push({
      userId,
      email,
      type,
      siretValide: Boolean(siret),
      siretBrutIgnore: !siret && Boolean(profile.company_siret),
    });
  }

  function imprimerRapport(report) {
    console.log(`\n=== Importés : ${report.importes.length} ===`);
    console.table(report.importes);

    console.log(`\n=== Ignorés : ${report.ignores.length} ===`);
    console.table(report.ignores);

    if (report.erreurs.length > 0) {
      console.log(`\n=== Erreurs : ${report.erreurs.length} ===`);
      console.table(report.erreurs);
    }

    const reportPath = path.join(ROOT, `migration-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\nRapport complet écrit dans ${reportPath}`);

    if (!WRITE) {
      console.log("\nDry-run terminé — relance avec --write pour écrire réellement en base.");
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
