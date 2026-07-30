"use client";

import { ContactStudio } from "@/components/public/ContactStudio";
import { submitPublicContact } from "@/lib/public-contact";

/** Homepage Contact primary send path (AURA-307). */
export function HomepageContactForm({
  studioName,
  slug,
}: {
  studioName: string;
  slug?: string;
}) {
  return (
    <ContactStudio
      studioName={studioName}
      source="homepage"
      submitLabel="Send message"
      className="mx-auto"
      onSubmit={async (values) => {
        await submitPublicContact({
          ...values,
          source: "homepage",
          slug,
        });
      }}
    />
  );
}
