"use client";

import { useEffect } from "react";

/**
 * Dernier filet : une erreur survenue dans le layout racine lui-même
 * (au-dessus de src/app/error.tsx). Doit fournir ses propres <html> /
 * <body>. Volontairement sans dépendance ni style de thème — il peut
 * s'afficher alors même que le layout a échoué.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FBFAF8",
          color: "#1A1917",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <p style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>Une erreur est survenue</p>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: "#6B6660", margin: "0 0 20px" }}>
            Un incident technique a interrompu le chargement de l&apos;application.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              minHeight: 44,
              padding: "0 20px",
              borderRadius: 10,
              border: "none",
              background: "#B8130F",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Réessayer
          </button>
          {error.digest && (
            <p style={{ marginTop: 20, fontSize: 11, fontFamily: "monospace", color: "#98938B" }}>
              Référence : {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
