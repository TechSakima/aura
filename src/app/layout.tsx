import type { Metadata, Viewport } from "next";
import {
  Cormorant_Garamond,
  DM_Sans,
  Figtree,
  Fraunces,
  Newsreader,
  Syne,
} from "next/font/google";
import { OfflineStatus } from "@/components/pwa/OfflineStatus";
import { RegisterSW } from "@/components/pwa/RegisterSW";
import { StandaloneChrome } from "@/components/pwa/StandaloneChrome";
import { ConfirmProvider } from "@/components/ui/confirm";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

/** Notch / home-indicator insets (AURA-281). Default chrome matches Aura canvas (AURA-295). */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f3efe6",
};

/** Default admin display — also used by serif / display kits */
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

/** Default admin body — also used by sans / display / soft kits */
const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Aura — Studio Photography",
  description: "Quotes, galleries, and delivery for a solo photography studio.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Aura",
  },
};

const fontVariables = [
  fraunces.variable,
  figtree.variable,
  newsreader.variable,
  dmSans.variable,
  syne.variable,
  cormorant.variable,
].join(" ");

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fontVariables} h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        <ToastProvider>
          <ConfirmProvider>
            <RegisterSW />
            <StandaloneChrome />
            <OfflineStatus />
            {children}
          </ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
