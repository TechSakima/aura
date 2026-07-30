"use client";

import { ContactStudio } from "@/components/public/ContactStudio";
import { submitPublicContact } from "@/lib/public-contact";

/** Gallery contact form — context included for Resend (AURA-308). */
export function GalleryContactForm({
  token,
  studioName,
  galleryTitle,
  onSuccess,
  className,
}: {
  token: string;
  studioName: string;
  galleryTitle?: string;
  onSuccess?: () => void;
  className?: string;
}) {
  const context = galleryTitle?.trim() || undefined;
  return (
    <ContactStudio
      studioName={studioName}
      source="gallery"
      initialContext={context}
      submitLabel="Send message"
      className={className}
      onSubmit={async (values) => {
        await submitPublicContact({
          ...values,
          source: "gallery",
          galleryToken: token,
          context: values.context || context,
        });
      }}
      onSuccess={onSuccess}
    />
  );
}
