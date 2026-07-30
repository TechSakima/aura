"use client";

import { GalleryContactForm } from "@/components/gallery/GalleryContactForm";
import { Dialog } from "@/components/ui/dialog";

/** Message studio without leaving the gallery (AURA-308). */
export function GalleryContactDialog({
  open,
  onClose,
  token,
  studioName,
  galleryTitle,
}: {
  open: boolean;
  onClose: () => void;
  token: string;
  studioName: string;
  galleryTitle?: string;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={studioName.trim() ? `Message ${studioName.trim()}` : "Message"}
    >
      <GalleryContactForm
        token={token}
        studioName={studioName}
        galleryTitle={galleryTitle}
        onSuccess={onClose}
      />
    </Dialog>
  );
}
