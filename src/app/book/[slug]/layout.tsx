import type { Metadata } from "next";
import { publicStudioShareMetadata } from "@/lib/public-studio-meta";

type Props = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return publicStudioShareMetadata(slug, { pathPrefix: "book" });
}

export default function BookLayout({ children }: Props) {
  return children;
}
