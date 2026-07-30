/** Build Web App Manifest icons for a public gallery (AURA-258). */
export function galleryPwaIcons(iconSrc?: string | null): {
  src: string;
  sizes: string;
  type: string;
  purpose: string;
}[] {
  if (iconSrc) {
    return [
      {
        src: iconSrc,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: iconSrc,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: iconSrc,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ];
  }
  return [
    {
      src: "/icon-192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "any",
    },
    {
      src: "/icon-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any",
    },
    {
      src: "/icon-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  ];
}

export function galleryPwaShortName(title: string, max = 12): string {
  const t = title.trim() || "Gallery";
  if (t.length <= max) return t;
  const word = t.split(/\s+/)[0] || t;
  if (word.length <= max) return word;
  return `${t.slice(0, max - 1)}…`;
}
