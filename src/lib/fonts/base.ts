import { Figtree, Fraunces } from "next/font/google";

/** Default Aura / admin pair — loaded on every route (AURA-398). */
export const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

export const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  display: "swap",
});

export const baseFontClassName = `${fraunces.variable} ${figtree.variable}`;
