import { ImageResponse } from "next/og";

// Generates the browser-tab / bookmark icon at build time using the exact
// same teal -> ocean gradient badge and "VD" mark already used for the
// Vietnam DMC brand in the sidebar (src/components/layout/sidebar.tsx) and
// the login screen (src/app/login/page.tsx). Replaces the generic default
// Next.js favicon — no new image asset, no design change, just reusing the
// app's existing brand colors so the tab icon matches the in-app branding.
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
          borderRadius: 7,
          background: "linear-gradient(135deg, #147169, #1E6FB8)",
          color: "#fff",
          fontSize: 15,
          fontWeight: 700,
          fontFamily: "sans-serif",
        }}
      >
        VD
      </div>
    ),
    { ...size }
  );
}
