import type { Metadata } from "next";
import { Fraunces, Figtree } from "next/font/google";
import { RegisterSW } from "@/components/pwa/RegisterSW";
import { ConfirmProvider } from "@/components/ui/confirm";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display-family",
  subsets: ["latin"],
});

const body = Figtree({
  variable: "--font-body-family",
  subsets: ["latin"],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        <ToastProvider>
          <ConfirmProvider>
            <RegisterSW />
            {children}
          </ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
