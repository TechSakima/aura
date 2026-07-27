"use client";

import { useState } from "react";
import { Button, useConfirm, useToast } from "@/components/ui";
import type { Shoot } from "@/lib/types";
import type { WizardGallery } from "@/components/wizard/useShootWizard";

export function WrapStep({
  shoot,
  gallery,
  photoCount,
  favoriteCount,
  onChanged,
}: {
  shoot: Shoot;
  gallery: WizardGallery | null;
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

  const archived =
    gallery?.status === "archived" || shoot.status === "archived";

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h2 className="font-display text-2xl">Wrap</h2>
        <p className="mt-1 text-sm text-muted">
          Archive when the gallery window closes.
        </p>
      </div>

      {!gallery ? (
        <p className="text-sm text-muted">No gallery yet — finish Delivery first.</p>
      ) : (
        <>
          <dl className="divide-y divide-line border-y border-line text-sm">
            <div className="flex items-baseline justify-between gap-4 py-3">
              <dt className="text-muted">Status</dt>
              <dd className="font-medium">{gallery.status}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-3">
              <dt className="text-muted">Photos</dt>
              <dd className="font-medium">{photoCount}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-3">
              <dt className="text-muted">Favorites</dt>
              <dd className="font-medium">{favoriteCount}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-3">
              <dt className="text-muted">Expires</dt>
              <dd className="font-medium">
                {new Date(gallery.expiresAt).toLocaleDateString()}
              </dd>
            </div>
          </dl>

          {archived ? (
            <p className="text-sm text-muted">Archived.</p>
          ) : (
            <Button
              tone="danger"
              className="min-h-11"
              disabled={archiving}
              onClick={() => void archive()}
            >
              {archiving ? "Archiving…" : "Archive & download zip"}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
