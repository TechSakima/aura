"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Button,
  ButtonLink,
  EmptyState,
  useConfirm,
  useToast,
} from "@/components/ui";
import {
  confirmArchiveGallery,
  confirmMarkDelivered,
} from "@/lib/destructive-confirm";
import type { Shoot } from "@/lib/types";
import type { WizardGallery } from "@/components/wizard/useShootWizard";

type WrapSummary = {
  completed?: boolean;
  project?: { id: string; stage: string; name: string } | null;
  gallery?: { id: string; status: string; showOnHomepage: boolean } | null;
  homepageEnabled?: boolean;
  openInvoiceCount?: number;
  remainingBalance?: number | null;
  session?: { status: string; projectId: string };
};

type SelectsSummary = {
  visitorCount: number;
  heartCount: number;
  submissionCount: number;
  submittedPhotoCount: number;
  selectLimit: number | null;
  submissions: {
    id: string;
    count: number;
    submittedAt: string;
    thumbs: { id: string; thumbUrl: string }[];
  }[];
};

export function WrapStep({
  shoot,
  gallery,
  photoCount,
  favoriteCount: _favoriteCount,
  onChanged,
}: {
  shoot: Shoot;
  gallery: WizardGallery | null;
  photoCount: number;
  /** @deprecated legacy shared favorites — Wrap loads visitor selects (AURA-248). */
  favoriteCount?: number;
  onChanged: () => Promise<unknown>;
}) {
  const { push } = useToast();
  const { confirm } = useConfirm();
  const [archiving, setArchiving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [wrap, setWrap] = useState<WrapSummary | null>(null);
  const [selects, setSelects] = useState<SelectsSummary | null>(null);

  const projectId = shoot.projectId || shoot.clientId;

  async function loadWrap() {
    const res = await fetch(`/api/sessions/${shoot.id}/wrap`);
    if (!res.ok) return;
    const data = (await res.json()) as WrapSummary;
    setWrap(data);
  }

  async function loadSelects() {
    if (!gallery?.id) {
      setSelects(null);
      return;
    }
    const res = await fetch(`/api/galleries/${gallery.id}/selects`);
    if (!res.ok) {
      setSelects(null);
      return;
    }
    setSelects((await res.json()) as SelectsSummary);
  }

  useEffect(() => {
    void loadWrap();
    void loadSelects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shoot.id, shoot.status, gallery?.id, gallery?.status, gallery?.showOnHomepage]);

  async function markDelivered() {
    const ok = await confirm(confirmMarkDelivered());
    if (!ok) return;
    setCompleting(true);
    const res = await fetch(`/api/sessions/${shoot.id}/wrap`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setCompleting(false);
    if (!res.ok) {
      push(String(data.error || "Could not complete"), "danger");
      return;
    }
    setWrap(data as WrapSummary);
    const stage = data.projectStage === "completed" ? "completed" : "delivered";
    push(
      stage === "completed"
        ? "Session complete"
        : "Marked delivered · open balance remains",
      stage === "completed" ? "success" : "neutral",
    );
    await onChanged();
  }

  async function archive() {
    if (!gallery) return;
    const ok = await confirm(confirmArchiveGallery());
    if (!ok) return;
    setArchiving(true);
    const res = await fetch(`/api/galleries/${gallery.id}/archive`, {
      method: "POST",
    });
    const payload = await res.json().catch(() => ({}));
    setArchiving(false);
    if (!res.ok) {
      push(String(payload.error || "Archive failed"), "danger");
      return;
    }
    const items = (payload.urls || []) as { url: string; filename: string }[];
    const detailsText = String(payload.detailsText || "");
    if (items.length) {
      try {
        push("Preparing zip…", "success");
        const JSZip = (await import("jszip")).default;
        const { saveBlobDownload } = await import("@/lib/client/zip-downloads");
        const zip = new JSZip();
        zip.file("project-details.txt", detailsText);
        for (const item of items) {
          const res = await fetch(item.url, { mode: "cors" });
          if (!res.ok) throw new Error(`fetch ${item.filename}`);
          zip.file(`photos/${item.filename}`, await res.arrayBuffer());
        }
        const blob = await zip.generateAsync({ type: "blob", compression: "STORE" });
        saveBlobDownload(
          blob,
          `archive-${(payload.galleryTitle || gallery.title).replace(/\s+/g, "-")}.zip`,
        );
      } catch {
        push("Zip failed — download links expired; try archive again", "danger");
        await onChanged();
        await loadWrap();
        return;
      }
    }
    if (payload.failed?.length) {
      push(`${payload.failed.length} photo${payload.failed.length === 1 ? "" : "s"} could not be signed`, "neutral");
    }
    push("Archived · project completed", "success");
    await onChanged();
    await loadWrap();
  }

  const archived =
    gallery?.status === "archived" || shoot.status === "archived";
  const delivered =
    shoot.status === "delivered" ||
    wrap?.completed ||
    wrap?.project?.stage === "delivered" ||
    wrap?.project?.stage === "completed";
  const openInvoices = wrap?.openInvoiceCount || 0;
  const remaining = wrap?.remainingBalance;
  const showHomepageHint =
    Boolean(wrap?.homepageEnabled) &&
    Boolean(gallery) &&
    gallery?.status !== "archived" &&
    !wrap?.gallery?.showOnHomepage &&
    !gallery?.showOnHomepage;

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h2 className="font-display text-2xl">Wrap</h2>
        <p className="mt-1 text-sm text-muted">
          Mark the session delivered, then archive when the gallery window closes.
        </p>
      </div>

      {!gallery ? (
        <EmptyState
          variant="inline"
          title="No gallery yet — finish Delivery first."
        />
      ) : (
        <>
          <dl className="divide-y divide-line border-y border-line text-sm">
            <div className="flex items-baseline justify-between gap-4 py-3">
              <dt className="text-muted">Session</dt>
              <dd className="font-medium">{shoot.status}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-3">
              <dt className="text-muted">Gallery</dt>
              <dd className="font-medium">{gallery.status}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-3">
              <dt className="text-muted">Photos</dt>
              <dd className="font-medium">{photoCount}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-3">
              <dt className="text-muted">Hearts</dt>
              <dd className="font-medium">
                {selects ? selects.heartCount : "—"}
                {selects?.selectLimit != null
                  ? ` · limit ${selects.selectLimit}`
                  : ""}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-3">
              <dt className="text-muted">Selects submitted</dt>
              <dd className="font-medium">
                {selects ? selects.submissionCount : "—"}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-3">
              <dt className="text-muted">Expires</dt>
              <dd className="font-medium">
                {new Date(gallery.expiresAt).toLocaleDateString()}
              </dd>
            </div>
          </dl>

          {selects && selects.submissions.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted">
                Submitted selects
              </p>
              <ul className="space-y-3">
                {selects.submissions.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-md border border-line bg-canvas p-3"
                  >
                    <p className="text-sm text-ink">
                      {s.count} photo{s.count === 1 ? "" : "s"}
                      <span className="text-muted">
                        {" "}
                        ·{" "}
                        {new Date(s.submittedAt).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </p>
                    {s.thumbs.length ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {s.thumbs.map((t) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={t.id}
                            src={t.thumbUrl}
                            alt=""
                            className="h-12 w-12 object-cover"
                          />
                        ))}
                        {s.count > s.thumbs.length ? (
                          <span className="flex h-12 min-w-12 items-center justify-center bg-line px-2 text-xs text-muted">
                            +{s.count - s.thumbs.length}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {(openInvoices > 0 ||
            (remaining != null && remaining > 0) ||
            showHomepageHint) && (
            <div className="space-y-2 rounded-md border border-line bg-canvas p-4 text-sm">
              <p className="font-medium text-ink">Before you close out</p>
              {openInvoices > 0 || (remaining != null && remaining > 0) ? (
                <p className="text-muted">
                  {openInvoices > 0
                    ? `${openInvoices} open invoice${openInvoices === 1 ? "" : "s"}`
                    : null}
                  {openInvoices > 0 && remaining != null && remaining > 0
                    ? " · "
                    : null}
                  {remaining != null && remaining > 0
                    ? `≈ $${Math.round(remaining)} remaining`
                    : null}
                  {projectId ? (
                    <>
                      {" "}
                      <Link
                        href={`/admin/projects/${projectId}#workflow`}
                        className="text-accent no-underline"
                      >
                        Balance on project
                      </Link>
                    </>
                  ) : null}
                </p>
              ) : null}
              {showHomepageHint ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-muted">Not on featured collections</p>
                  <ButtonLink
                    href="/admin/settings/website#featured"
                    tone="neutral"
                    className="w-full sm:w-auto"
                  >
                    Featured collections
                  </ButtonLink>
                </div>
              ) : null}
            </div>
          )}

          {!delivered && !archived ? (
            <Button
              className="min-h-11 w-full"
              pending={completing}
              pendingLabel="Saving…"
              onClick={() => void markDelivered()}
            >
              Mark delivered
            </Button>
          ) : delivered && !archived ? (
            <p className="text-sm text-muted">
              {wrap?.project?.stage === "completed"
                ? "Project completed."
                : "Session delivered."}
            </p>
          ) : null}

          {archived ? (
            <p className="text-sm text-muted">Archived.</p>
          ) : (
            <Button
              tone="danger"
              className="min-h-11 w-full"
              pending={archiving}
              pendingLabel="Archiving…"
              onClick={() => void archive()}
            >
              Archive &amp; download zip
            </Button>
          )}
        </>
      )}
    </div>
  );
}
