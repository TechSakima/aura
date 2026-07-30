"use client";

import { ContactStudio } from "@/components/public/ContactStudio";
import { cn } from "@/lib/cn";
import {
  submitPublicContact,
  type PublicContactSource,
} from "@/lib/public-contact";

/** Message studio from booking / quote / pay / cancel soft failures (AURA-309 / 382). */
export function PublicSoftFailureContact({
  studioName,
  source,
  slug,
  proposalToken,
  paymentLinkId,
  cancelToken,
  context,
  className,
}: {
  studioName: string;
  source: PublicContactSource;
  slug?: string;
  proposalToken?: string;
  paymentLinkId?: string;
  cancelToken?: string;
  context?: string;
  className?: string;
}) {
  return (
    <div className={cn("mt-8 w-full max-w-md text-left", className)}>
      <ContactStudio
        studioName={studioName}
        source={source}
        initialContext={context}
        submitLabel="Send message"
        onSubmit={async (values) => {
          await submitPublicContact({
            ...values,
            source,
            slug,
            proposalToken,
            paymentLinkId,
            cancelToken,
            context: values.context || context,
          });
        }}
      />
    </div>
  );
}
