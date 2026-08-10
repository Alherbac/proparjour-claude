import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const MIGRATION_DIR = path.join(ROOT, "migration-data");
const AVATARS_DIR = path.join(MIGRATION_DIR, "avatars");
const SUPABASE_URL = "https://npfgmjfohkcuxunwegjh.supabase.co";

const manifest = JSON.parse(fs.readFileSync(path.join(MIGRATION_DIR, "storage_manifest.json"), "utf8"));
const avatars = manifest.filter((m) => m.bucket === "avatars");

console.log(`${avatars.length} avatars à télécharger...\n`);

let ok = 0;
let failed = 0;

for (const avatar of avatars) {
  const url = `${SUPABASE_URL}/storage/v1/object/public/avatars/${avatar.path}`;
  const destPath = path.join(AVATARS_DIR, avatar.path);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`ÉCHEC ${res.status}  ${avatar.path}`);
      failed++;
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length !== avatar.size) {
      console.log(`TAILLE INCORRECTE  ${avatar.path}  (reçu ${buf.length}, attendu ${avatar.size})`);
      failed++;
      continue;
    }
    fs.writeFileSync(destPath, buf);
    ok++;
  } catch (err) {
    console.log(`ERREUR  ${avatar.path}  ${err.message}`);
    failed++;
  }
}

console.log(`\nTerminé : ${ok} téléchargés, ${failed} échecs.`);
