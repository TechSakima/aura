"use client";

import { useState } from "react";
import { ShootPublicLinks } from "@/components/admin/ShootPublicLinks";
import { Button, useConfirm, useToast } from "@/components/ui";
import type { Shoot } from "@/lib/types";
import type { WizardGallery } from "@/components/wizard/useShootWizard";

export function WrapStep({
  shoot,
  gallery,
  quoteToken,
  photoCount,
  favoriteCount,
  onChanged,
}: {
  shoot: Shoot;
  gallery: WizardGallery | null;
  quoteToken?: string | null;
  photoCount: number;
  favoriteCount: number;
  onChanged: () => Promise<unknown>;
}) {
  const { push } = useToast();
  const { confirm } = useConfirm();
  const [archiving, setArchiving] = useState(false);

  async function archive() {
    if (!gallery) return;
    const ok = await confirm({
      title: "Archive gallery?",
      message: "A zip will download and photos will be removed from the gallery.",
      confirmLabel: "Archive",
      tone: "danger",
    });
    if (!ok) return;
    setArchiving(true);
    const res = await fetch(`/api/galleries/${gallery.id}/archive`, {
      method: "POST",
    });
    setArchiving(false);
    if (!res.ok) {
      push("Archive failed", "danger");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `archive-${gallery.title.replace(/\s+/g, "-")}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    push("Archived", "success");
    await onChanged();
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl">Wrap</h2>
        <p className="mt-1 text-sm text-muted">
          Open the client pages, check favorites, then archive when the window closes.
        </p>
      </div>

      <ShootPublicLinks
        quoteToken={quoteToken}
        galleryToken={gallery?.publicToken}
        size="md"
        showCopy
      />

      {!gallery ? (
        <p className="text-sm text-muted">No gallery yet — finish Delivery first.</p>
      ) : (
        <div className="space-y-4">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-md border border-line p-3">
              <dt className="text-muted">Status</dt>
              <dd className="font-medium">{gallery.status}</dd>
            </div>
            <div className="rounded-md border border-line p-3">
              <dt className="text-muted">Photos</dt>
              <dd className="font-medium">{photoCount}</dd>
            </div>
            <div className="rounded-md border border-line p-3">
              <dt className="text-muted">Client favorites</dt>
              <dd className="font-medium">{favoriteCount}</dd>
            </div>
            <div className="rounded-md border border-line p-3">
              <dt className="text-muted">Expires</dt>
              <dd className="font-medium">
                {new Date(gallery.expiresAt).toLocaleDateString()}
              </dd>
            </div>
          </dl>

          {gallery.status !== "archived" && shoot.status !== "archived" ? (
            <div>
              <Button tone="danger" disabled={archiving} onClick={() => void archive()}>
                {archiving ? "Archiving…" : "Archive & download zip"}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted">This job is archived. Nice work.</p>
          )}
        </div>
      )}
    </div>
  );
}
