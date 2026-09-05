import type { Metadata } from "next";
import { Kanit, Noto_Sans_Thai } from "next/font/google";
import { AppProviders } from "@/context/app-providers";
import "./globals.css";

const display = Kanit({
  variable: "--font-display",
  subsets: ["thai", "latin"],
  weight: ["500", "600", "700"],
});

const body = Noto_Sans_Thai({
  variable: "--font-body",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "G2WP",
  description: "ระบบจัดการสมาชิก WarZTH — Zombie Survival Portal",
  applicationName: "Member G2WP",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full font-[family-name:var(--font-body)]">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
