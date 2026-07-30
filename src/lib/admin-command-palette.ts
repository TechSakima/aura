import { projectWorkflowHref } from "@/lib/admin-deep-links";

export type AdminPaletteItem = {
  id: string;
  label: string;
  detail?: string;
  href: string;
  group: "page" | "project";
};

export const ADMIN_PALETTE_PAGES: AdminPaletteItem[] = [
  { id: "page-dashboard", label: "Dashboard", href: "/admin", group: "page" },
  {
    id: "page-projects",
    label: "Projects",
    href: "/admin/projects",
    group: "page",
  },
  {
    id: "page-bookings",
    label: "Bookings",
    href: "/admin/bookings",
    group: "page",
  },
  {
    id: "page-payments",
    label: "Payments",
    href: "/admin/payments",
    group: "page",
  },
  {
    id: "page-documents",
    label: "Documents",
    href: "/admin/documents",
    group: "page",
  },
  {
    id: "page-galleries",
    label: "Galleries",
    href: "/admin/galleries",
    group: "page",
  },
  { id: "page-library", label: "Library", href: "/admin/prep", group: "page" },
  {
    id: "page-analytics",
    label: "Analytics",
    href: "/admin/analytics",
    group: "page",
  },
  {
    id: "page-settings",
    label: "Settings",
    href: "/admin/settings",
    group: "page",
  },
];

export function projectToPaletteItem(p: {
  id: string;
  name: string;
  email?: string;
}): AdminPaletteItem {
  return {
    id: `project-${p.id}`,
    label: p.name,
    detail: p.email?.trim() || undefined,
    href: projectWorkflowHref(p.id),
    group: "project",
  };
}

/** Filter + rank palette rows for jump-to (AURA-124). */
export function filterAdminPaletteItems(
  items: AdminPaletteItem[],
  query: string,
  opts?: { emptyProjectLimit?: number },
): AdminPaletteItem[] {
  const q = query.trim().toLowerCase();
  const emptyProjectLimit = opts?.emptyProjectLimit ?? 8;

  if (!q) {
    const pages = items.filter((i) => i.group === "page");
    const projects = items
      .filter((i) => i.group === "project")
      .slice(0, emptyProjectLimit);
    return [...pages, ...projects];
  }

  const scored = items
    .map((item) => {
      const label = item.label.toLowerCase();
      const detail = (item.detail || "").toLowerCase();
      let score = 0;
      if (label === q) score = 100;
      else if (label.startsWith(q)) score = 80;
      else if (label.includes(q)) score = 60;
      else if (detail.includes(q)) score = 40;
      else return null;
      // Prefer projects slightly when scores tie and query looks like a name.
      if (item.group === "project") score += 1;
      return { item, score };
    })
    .filter((row): row is { item: AdminPaletteItem; score: number } =>
      Boolean(row),
    )
    .sort((a, b) => b.score - a.score || a.item.label.localeCompare(b.item.label));

  return scored.map((row) => row.item).slice(0, 24);
}
