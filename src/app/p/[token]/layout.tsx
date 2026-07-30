import type { Metadata, Viewport } from "next";
import {
  publicFlowMetadata,
  publicFlowViewport,
} from "@/lib/public-flow-pwa";

type Props = {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  return publicFlowMetadata("proposal", token);
}

export async function generateViewport({ params }: Props): Promise<Viewport> {
  const { token } = await params;
  return publicFlowViewport("proposal", token);
}

export default function QuoteLayout({ children }: Props) {
  return children;
}
