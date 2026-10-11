import type { Metadata, Viewport } from "next";
import { AppProviders } from "@/context/app-providers";
import "@fontsource/kanit/thai-600.css";
import "@fontsource/kanit/latin-600.css";
import "@fontsource/kanit/thai-700.css";
import "@fontsource/kanit/latin-700.css";
import "@fontsource/noto-sans-thai/thai-400.css";
import "@fontsource/noto-sans-thai/latin-400.css";
import "@fontsource/noto-sans-thai/thai-500.css";
import "@fontsource/noto-sans-thai/latin-500.css";
import "@fontsource/noto-sans-thai/thai-600.css";
import "@fontsource/noto-sans-thai/latin-600.css";
import "@fontsource/noto-sans-thai/thai-700.css";
import "@fontsource/noto-sans-thai/latin-700.css";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0908",
};

export const metadata: Metadata = {
  title: "G2WP",
  description: "ระบบจัดการสมาชิก WarZTH — Zombie Survival Portal",
  applicationName: "Member G2WP",
  appleWebApp: {
    capable: true,
    title: "G2WP",
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className="h-full antialiased">
      <body className="min-h-full font-[family-name:var(--font-body)]">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
