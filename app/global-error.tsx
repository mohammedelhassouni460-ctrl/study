"use client";

/** Last-resort error boundary (replaces the root layout, so it must render <html>). */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100dvh", margin: 0 }}>
        <div style={{ textAlign: "center", maxWidth: 420, padding: 16 }}>
          <h1>Oups, StudyOS a rencontré un problème</h1>
          <p>Réessaie dans un instant{error.digest ? ` (code ${error.digest})` : ""}.</p>
          <button type="button" onClick={reset} style={{ padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}>
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
