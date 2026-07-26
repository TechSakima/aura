import type { Metadata } from "next";

type Props = { children: React.ReactNode; params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  return {
    manifest: `/g/${token}/manifest.webmanifest`,
    appleWebApp: {
      capable: true,
      title: "Aura Gallery",
    },
  };
}

export default function GalleryLayout({ children }: Props) {
  return children;
}
