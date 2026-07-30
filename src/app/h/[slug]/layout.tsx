import type { Metadata, Viewport } from "next";
import {
  publicStudioShareMetadata,
  publicStudioViewport,
} from "@/lib/public-studio-meta";

type Props = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return publicStudioShareMetadata(slug, { pathPrefix: "h" });
}

export async function generateViewport({ params }: Props): Promise<Viewport> {
  const { slug } = await params;
  return publicStudioViewport(slug);
}

export default function HomepageLayout({ children }: Props) {
  return children;
}
