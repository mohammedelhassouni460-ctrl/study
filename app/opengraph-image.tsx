import { ImageResponse } from "next/og";

export const alt = "StudyOS AI — Tes cours. Ton plan. Ta réussite.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 40, fontWeight: 700 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            S
          </div>
          StudyOS AI
        </div>
        <div style={{ marginTop: 48, fontSize: 76, fontWeight: 800, lineHeight: 1.1 }}>Tes cours. Ton plan. Ta réussite.</div>
        <div style={{ marginTop: 28, fontSize: 32, opacity: 0.85 }}>
          Fiches, flashcards, quiz et planning de révision générés à partir de tes cours.
        </div>
      </div>
    ),
    size,
  );
}
