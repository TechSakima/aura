import type { Metadata, Viewport } from "next";
import {
  publicFlowMetadata,
  publicFlowViewport,
} from "@/lib/public-flow-pwa";

type Props = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return publicFlowMetadata("pay", id);
}

export async function generateViewport({ params }: Props): Promise<Viewport> {
  const { id } = await params;
  return publicFlowViewport("pay", id);
}

export default function PayLayout({ children }: Props) {
  return children;
}
