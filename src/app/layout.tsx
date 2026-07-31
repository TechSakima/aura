import type { Metadata, Viewport } from "next";
import { OfflineStatus } from "@/components/pwa/OfflineStatus";
import { RegisterSW } from "@/components/pwa/RegisterSW";
import { StandaloneChrome } from "@/components/pwa/StandaloneChrome";
import { ConfirmProvider } from "@/components/ui/confirm";
import { ToastProvider } from "@/components/ui/toast";
import { baseFontClassName } from "@/lib/fonts/base";
import "./globals.css";

/** Notch / home-indicator insets (AURA-281). Default chrome matches Aura canvas (AURA-295). */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f3efe6",
};

export const metadata: Metadata = {
  title: "Aura — Studio Photography",
  description: "Quotes, galleries, and delivery for a solo photography studio.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Aura",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${baseFontClassName} h-full`}>
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
