import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Non applicatif : copie de sauvegarde et exports d'outils de
    // design déposés à la racine (déjà exclus de git et de tsconfig).
    "_archive/**",
    "3 Istanbul design 2/**",
    "Asia design proparjour/**",
    "Claude Istanbul 1/**",
    "110790prodesign/**",
    "migration-data/**",
  ]),
]);

export default eslintConfig;
