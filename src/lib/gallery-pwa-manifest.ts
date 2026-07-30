export type PwaManifestIcon = {
  src: string;
  sizes: string;
  type: string;
  purpose: string;
};

/** Same-origin PNG icon entries — static Aura or `/api/pwa-icon` (AURA-289). */
export function pwaManifestIcons(iconQuery?: string | null): PwaManifestIcon[] {
  if (!iconQuery) {
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
        src: "/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ];
  }

  const q = iconQuery.replace(/^\?/, "");
  return [
    {
      src: `/api/pwa-icon?${q}&size=192&purpose=any`,
      sizes: "192x192",
      type: "image/png",
      purpose: "any",
    },
    {
      src: `/api/pwa-icon?${q}&size=512&purpose=any`,
      sizes: "512x512",
      type: "image/png",
      purpose: "any",
    },
    {
      src: `/api/pwa-icon?${q}&size=512&purpose=maskable`,
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
