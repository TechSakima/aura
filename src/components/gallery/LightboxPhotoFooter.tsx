"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Button, Sheet } from "@/components/ui";

/**
 * Lightbox footer — Download / Favorite primary; comments in Sheet (AURA-449).
 * Avoids crushing Post + fields into a short max-h strip at 375.
 */
export function LightboxPhotoFooter({
  photoId,
  favorited,
  commentsEnabled,
  commentCount,
  onDownload,
  onToggleFavorite,
  commentsPanel,
}: {
  photoId: string;
  favorited: boolean;
  commentsEnabled: boolean;
  commentCount: number;
  onDownload: () => void;
  onToggleFavorite: () => void;
  commentsPanel?: ReactNode;
}) {
  const [commentsOpen, setCommentsOpen] = useState(false);

  useEffect(() => {
    setCommentsOpen(false);
  }, [photoId]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" className="min-h-11" onClick={onDownload}>
          Download
        </Button>
        <Button
          size="sm"
          tone="ghost"
          className="min-h-11"
          onClick={onToggleFavorite}
        >
          {favorited ? "Unfavorite" : "Favorite"}
        </Button>
        {commentsEnabled ? (
          <Button
            size="sm"
            tone="ghost"
            className="min-h-11"
            onClick={() => setCommentsOpen(true)}
          >
            {commentCount > 0 ? `Comments (${commentCount})` : "Comments"}
          </Button>
        ) : null}
      </div>

      {commentsEnabled ? (
        <Sheet
          open={commentsOpen}
          onClose={() => setCommentsOpen(false)}
          title="Comments"
        >
          {commentsPanel}
        </Sheet>
      ) : null}
    </div>
  );
}
