import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#4a5c38",
          borderRadius: 8,
          color: "#efe6d8",
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: "-0.04em",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        G2
      </div>
    ),
    { ...size },
  );
}
