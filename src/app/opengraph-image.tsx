import { ImageResponse } from "next/og";

import { brand } from "@/config/brand";

export const alt = `${brand.name} — ${brand.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  const p = brand.palette;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: p.canvas,
          color: p.ink,
          padding: "48px",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            border: `1px solid ${p.line}`,
            borderRadius: "36px",
            backgroundColor: p.surface,
            padding: "46px 54px 40px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "46px",
                height: "46px",
                borderRadius: "999px",
                backgroundColor: p.moss,
                color: p.canvas,
                fontSize: "23px",
                fontWeight: 700,
              }}
            >
              A
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "-0.5px" }}>
                {brand.name}
              </div>
              <div
                style={{
                  fontSize: "13px",
                  letterSpacing: "2.5px",
                  textTransform: "uppercase",
                  color: p.moss,
                  fontWeight: 700,
                }}
              >
                A shared travel atlas
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "42px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", maxWidth: "650px" }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  fontSize: "74px",
                  lineHeight: 1.02,
                  letterSpacing: "-3px",
                }}
              >
                <span>Your world,</span>
                <span style={{ color: p.moss, fontStyle: "italic" }}>
                  mapped together.
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  marginTop: "22px",
                  fontSize: "23px",
                  lineHeight: 1.4,
                  color: p.inkMuted,
                  maxWidth: "560px",
                }}
              >
                A private country map you can share with the people you travel
                with.
              </div>
            </div>

            <div
              style={{
                display: "flex",
                position: "relative",
                alignItems: "center",
                justifyContent: "center",
                width: "318px",
                height: "318px",
                borderRadius: "999px",
                backgroundColor: p.map,
                border: `1px solid ${p.line}`,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  position: "absolute",
                  width: "262px",
                  height: "262px",
                  borderRadius: "999px",
                  border: `1px solid ${p.moss}`,
                  opacity: 0.35,
                }}
              />
              <div
                style={{
                  display: "flex",
                  position: "absolute",
                  width: "172px",
                  height: "262px",
                  borderRadius: "999px",
                  border: `1px solid ${p.moss}`,
                  opacity: 0.25,
                }}
              />
              <div
                style={{
                  display: "flex",
                  position: "absolute",
                  width: "262px",
                  height: "172px",
                  borderRadius: "999px",
                  border: `1px solid ${p.moss}`,
                  opacity: 0.25,
                }}
              />
              <div
                style={{
                  display: "flex",
                  width: "18px",
                  height: "18px",
                  borderRadius: "999px",
                  backgroundColor: p.rose,
                  border: `3px solid ${p.surface}`,
                  position: "absolute",
                  top: "76px",
                  left: "102px",
                }}
              />
              <div
                style={{
                  display: "flex",
                  width: "14px",
                  height: "14px",
                  borderRadius: "999px",
                  backgroundColor: p.rose,
                  border: `3px solid ${p.surface}`,
                  position: "absolute",
                  top: "188px",
                  left: "204px",
                }}
              />
              <div
                style={{
                  display: "flex",
                  width: "20px",
                  height: "20px",
                  borderRadius: "999px",
                  backgroundColor: p.rose,
                  border: `3px solid ${p.surface}`,
                  position: "absolute",
                  top: "222px",
                  left: "112px",
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "18px",
              color: p.moss,
            }}
          >
            <span>195 countries · Private by default</span>
            <span>No analytics or location tracking</span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
