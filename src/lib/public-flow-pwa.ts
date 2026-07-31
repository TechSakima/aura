import type { Metadata, Viewport } from "next";
import { cache } from "react";
import { listStudiosWithPaymentLink } from "@/lib/db/payments";
import {
  findContractByToken,
  findProposalByToken,
  findQuestionnaireResponseByToken,
  findStudioIdByProjectCancelToken,
  getStudioDoc,
} from "@/lib/db/store";
import {
  appleStatusBarForBackground,
  studioPwaBrand,
  studioPwaIconMediaUrl,
} from "@/lib/studio-pwa-manifest";
import type { Studio } from "@/lib/types";

export type PublicFlowKind =
  | "proposal"
  | "contract"
  | "pay"
  | "questionnaire"
  | "cancel";

type FlowChrome = {
  studio: Studio | null;
  brand: ReturnType<typeof studioPwaBrand>;
  /** Page title for OS / browser. */
  title: string;
  description: string;
  path: string;
  /** Query for `/api/pwa-icon` when studio has a mark. */
  iconQuery: string | null;
};

const flowLabels: Record<
  PublicFlowKind,
  { namePrefix: string; description: (studio: string) => string }
> = {
  proposal: {
    namePrefix: "Quote",
    description: (s) => `Quote from ${s}`,
  },
  contract: {
    namePrefix: "Contract",
    description: (s) => `Contract with ${s}`,
  },
  pay: {
    namePrefix: "Pay",
    description: (s) => `Pay ${s}`,
  },
  questionnaire: {
    namePrefix: "Questionnaire",
    description: (s) => `Questionnaire from ${s}`,
  },
  cancel: {
    namePrefix: "Change or cancel",
    description: (s) => `Change or cancel with ${s}`,
  },
};

async function studioForFlow(
  kind: PublicFlowKind,
  id: string,
): Promise<{ studio: Studio | null; detailTitle?: string }> {
  if (kind === "proposal") {
    const hit = await findProposalByToken(id);
    if (!hit?.studioId) return { studio: null };
    const studio = await getStudioDoc(hit.studioId);
    return { studio, detailTitle: hit.title?.trim() || undefined };
  }
  if (kind === "contract") {
    const hit = await findContractByToken(id);
    if (!hit?.studioId) return { studio: null };
    const studio = await getStudioDoc(hit.studioId);
    return { studio, detailTitle: hit.title?.trim() || undefined };
  }
  if (kind === "questionnaire") {
    const hit = await findQuestionnaireResponseByToken(id);
    if (!hit?.studioId) return { studio: null };
    const studio = await getStudioDoc(hit.studioId);
    return { studio, detailTitle: hit.title?.trim() || undefined };
  }
  if (kind === "cancel") {
    const studioId = await findStudioIdByProjectCancelToken(id);
    if (!studioId) return { studio: null };
    const studio = await getStudioDoc(studioId);
    return { studio };
  }
  const hit = await listStudiosWithPaymentLink(id);
  if (!hit) return { studio: null };
  const studio = await getStudioDoc(hit.studioId);
  return {
    studio,
    detailTitle: hit.link.title?.trim() || undefined,
  };
}

function pathForFlow(kind: PublicFlowKind, id: string): string {
  if (kind === "proposal") return `/p/${id}`;
  if (kind === "contract") return `/c/${id}`;
  if (kind === "questionnaire") return `/q/${id}`;
  if (kind === "cancel") return `/cancel/${id}`;
  return `/pay/${id}`;
}

function iconQueryForFlow(kind: PublicFlowKind, id: string): string {
  if (kind === "proposal") return `proposal=${encodeURIComponent(id)}`;
  if (kind === "contract") return `contract=${encodeURIComponent(id)}`;
  if (kind === "questionnaire") return `questionnaire=${encodeURIComponent(id)}`;
  if (kind === "cancel") return `cancel=${encodeURIComponent(id)}`;
  return `pay=${encodeURIComponent(id)}`;
}

/** Studio brand chrome for quote / contract / pay / q / cancel (AURA-299 / 418). */
export const publicFlowPwaChrome = cache(
  async (kind: PublicFlowKind, id: string): Promise<FlowChrome> => {
    const { studio, detailTitle } = await studioForFlow(kind, id);
    const brand = studioPwaBrand(studio);
    const labels = flowLabels[kind];
    const title = detailTitle
      ? `${detailTitle} · ${brand.name}`
      : `${labels.namePrefix} — ${brand.name}`;
    return {
      studio,
      brand,
      title,
      description: labels.description(brand.name),
      path: pathForFlow(kind, id),
      iconQuery: studio && studioPwaIconMediaUrl(studio)
        ? iconQueryForFlow(kind, id)
        : null,
    };
  },
);

export async function publicFlowMetadata(
  kind: PublicFlowKind,
  id: string,
): Promise<Metadata> {
  const chrome = await publicFlowPwaChrome(kind, id);
  return {
    title: chrome.title,
    description: chrome.description,
    manifest: `${chrome.path}/manifest.webmanifest`,
    appleWebApp: {
      capable: true,
      title: chrome.brand.shortName,
      statusBarStyle: appleStatusBarForBackground(chrome.brand.themeColor),
    },
  };
}

export async function publicFlowViewport(
  kind: PublicFlowKind,
  id: string,
): Promise<Viewport> {
  const chrome = await publicFlowPwaChrome(kind, id);
  return { themeColor: chrome.brand.themeColor };
}
