import { ImageResponse } from "next/og";

export const alt = "NR-35 — Trabalho em Altura | SEICO";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        color: "#ffffff",
        background: "#061725",
        fontFamily: "Arial, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 620,
          height: 620,
          right: -100,
          top: -180,
          border: "1px solid rgba(123, 212, 202, .32)",
          borderRadius: "50%",
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 440,
          height: 440,
          right: -10,
          top: -90,
          border: "1px solid rgba(123, 212, 202, .32)",
          borderRadius: "50%",
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 260,
          height: 260,
          right: 80,
          top: 0,
          border: "1px solid rgba(123, 212, 202, .32)",
          borderRadius: "50%",
          display: "flex",
        }}
      />

      <div
        style={{
          width: 18,
          height: "100%",
          background: "#1aa69a",
          display: "flex",
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "62px 76px 58px",
          flex: 1,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 48,
              height: 48,
              borderRadius: "6px 16px 6px 6px",
              color: "#061725",
              background: "#7bd4ca",
              fontSize: 26,
              fontWeight: 800,
            }}
          >
            S
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: 5 }}>SEICO</span>
            <span style={{ color: "#a9bcc5", fontSize: 11, letterSpacing: 2.2 }}>
              SEGURANÇA DO TRABALHO
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", maxWidth: 880 }}>
          <span style={{ color: "#7bd4ca", fontSize: 18, fontWeight: 700, letterSpacing: 3 }}>
            TREINAMENTO NORMATIVO · 8 HORAS
          </span>
          <span
            style={{
              marginTop: 20,
              fontFamily: "Georgia, serif",
              fontSize: 78,
              lineHeight: 0.98,
              letterSpacing: -3.5,
            }}
          >
            NR-35 — Trabalho em Altura
          </span>
        </div>

        <div style={{ display: "flex", gap: 46, color: "#c7d6dc", fontSize: 18 }}>
          <span>8h de carga horária</span>
          <span>•</span>
          <span>24 meses de validade</span>
          <span>•</span>
          <span>Próximos passos claros</span>
        </div>
      </div>
    </div>,
    size,
  );
}
