"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  ButtonLink,
  EmptyState,
  Field,
  Input,
  Label,
  List,
  ListRow,
  PageHeader,
  Select,
  useToast,
} from "@/components/ui";
import { ADMIN_LIST_PAGE } from "@/lib/admin-list-page";
import { adminPreviewHref } from "@/lib/admin-preview-paths";
import type { GalleryStatus } from "@/lib/types";

type GalleryRow = {
  id: string;
  title: string;
  status: GalleryStatus;
  expiresAt: string;
  projectName?: string;
  adminHref: string;
  publicToken: string;
};

function statusTone(
  status: GalleryStatus,
): "neutral" | "accent" | "success" | "danger" {
  if (status === "live") return "success";
  if (status === "expired") return "danger";
  if (status === "draft") return "accent";
  return "neutral";
}

function statusLabel(status: GalleryStatus) {
  if (status === "live") return "Live";
  if (status === "expired") return "Expired";
  if (status === "draft") return "Draft";
  if (status === "archived") return "Archived";
  return status;
}

function formatExpiry(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function GalleriesPage() {
  const { push } = useToast();
  const [rows, setRows] = useState<GalleryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [status, setStatus] = useState("all");

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => window.clearTimeout(t);
  }, [q]);

  async function loadPage(offset: number, append: boolean) {
    if (append) setLoadingMore(true);
    else setLoading(true);
    const params = new URLSearchParams({
      offset: String(offset),
      limit: String(ADMIN_LIST_PAGE),
    });
    if (debouncedQ) params.set("q", debouncedQ);
    if (status !== "all") params.set("status", status);
    const res = await fetch(`/api/galleries?${params}`);
    if (!res.ok) {
      setLoading(false);
      setLoadingMore(false);
      push("Could not load galleries", "danger");
      return;
    }
    const data = await res.json();
    const next = (data.galleries || []) as GalleryRow[];
    setRows((prev) => (append ? [...prev, ...next] : next));
    setHasMore(Boolean(data.hasMore));
    setTotal(Number(data.total) || next.length);
    setLoading(false);
    setLoadingMore(false);
  }

  useEffect(() => {
    void loadPage(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, status]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Delivery"
        title="Galleries"
        actions={
          <ButtonLink
            href="/admin/settings/delivery"
            tone="ghost"
            className="min-h-11"
          >
            Delivery defaults
          </ButtonLink>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <Label htmlFor="gallery-q">Search</Label>
          <Input
            id="gallery-q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Title or project"
            autoComplete="off"
          />
        </Field>
        <Field>
          <Label htmlFor="gallery-status">Status</Label>
          <Select
            id="gallery-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All</option>
            <option value="live">Live</option>
            <option value="draft">Draft</option>
            <option value="expired">Expired</option>
            <option value="archived">Archived</option>
          </Select>
        </Field>
      </div>

      {loading ? (
        <EmptyState variant="loading" title="Loading galleries…" />
      ) : rows.length === 0 ? (
        <EmptyState
          variant="inline"
          title="No galleries"
          description="Create a gallery from a project’s Delivery step."
          action={
            <ButtonLink href="/admin/projects" className="min-h-11">
              Open projects
            </ButtonLink>
          }
        />
      ) : (
        <>
          <p className="text-sm text-muted">
            {total} gallery{total === 1 ? "" : "ies"}
          </p>
          <List>
            {rows.map((g) => (
              <ListRow key={g.id}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium" title={g.title}>
                      {g.title}
                    </p>
                    <Badge tone={statusTone(g.status)}>
                      {statusLabel(g.status)}
                    </Badge>
                  </div>
                  <p
                    className="mt-0.5 truncate text-sm text-muted"
                    title={`${g.projectName || "Project"}${g.expiresAt ? ` · Expires ${formatExpiry(g.expiresAt)}` : ""}`}
                  >
                    {g.projectName || "Project"}
                    {g.expiresAt ? ` · Expires ${formatExpiry(g.expiresAt)}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                  <a
                    className="inline-flex min-h-11 items-center justify-center text-sm text-muted no-underline hover:text-ink"
                    href={adminPreviewHref("g", g.publicToken, "/admin/galleries")}
                  >
                    Preview
                  </a>
                  <Link
                    href={g.adminHref}
                    className="inline-flex min-h-11 items-center justify-center text-sm text-accent no-underline"
                  >
                    Open
                  </Link>
                </div>
              </ListRow>
            ))}
          </List>
          {hasMore ? (
            <Button
              tone="neutral"
              className="min-h-11 w-full sm:w-auto"
              pending={loadingMore}
              pendingLabel="Loading…"
              onClick={() => void loadPage(rows.length, true)}
            >
              Load more
            </Button>
          ) : null}
        </>
      )}
    </div>
  );
}
