import { safeAdminNext } from "@/lib/safe-admin-next";

/** Public surfaces opened from installed admin via in-shell preview (AURA-445). */
export const ADMIN_PREVIEW_KINDS = ["c", "q", "p", "g", "book"] as const;

export type AdminPreviewKind = (typeof ADMIN_PREVIEW_KINDS)[number];

const KIND_META: Record<
  AdminPreviewKind,
  { label: string; defaultBack: string; publicPath: (id: string) => string }
> = {
  c: {
    label: "Contract",
    defaultBack: "/admin/documents",
    publicPath: (id) => `/c/${id}`,
  },
  q: {
    label: "Questionnaire",
    defaultBack: "/admin/documents?tab=questionnaires",
    publicPath: (id) => `/q/${id}`,
  },
  p: {
    label: "Quote",
    defaultBack: "/admin/projects",
    publicPath: (id) => `/p/${id}`,
  },
  g: {
    label: "Gallery",
    defaultBack: "/admin/projects",
    publicPath: (id) => `/g/${id}`,
  },
  book: {
    label: "Booking",
    defaultBack: "/admin/settings/booking",
    publicPath: (id) => `/book/${id}`,
  },
};

export function isAdminPreviewKind(value: string): value is AdminPreviewKind {
  return (ADMIN_PREVIEW_KINDS as readonly string[]).includes(value);
}

export function adminPreviewMeta(kind: AdminPreviewKind) {
  return KIND_META[kind];
}

/** In-shell preview URL under `/admin` PWA scope. */
export function adminPreviewHref(
  kind: AdminPreviewKind,
  id: string,
  from?: string | null,
): string {
  const base = `/admin/preview/${kind}/${encodeURIComponent(id)}`;
  const raw = from?.trim();
  if (!raw?.startsWith("/admin")) return base;
  return `${base}?from=${encodeURIComponent(safeAdminNext(raw))}`;
}

export function adminPreviewPublicPath(
  kind: AdminPreviewKind,
  id: string,
): string {
  return KIND_META[kind].publicPath(id);
}

export function adminPreviewBackHref(
  kind: AdminPreviewKind,
  from?: string | null,
): string {
  if (!from) return KIND_META[kind].defaultBack;
  return safeAdminNext(from);
}
