import type { PrintPartner } from "@/lib/types";
import { publicPrintPartners } from "@/lib/print-partners";

/** Quiet print CTA when studio has partners (AURA-259). */
export function GalleryPrintPartners({
  partners,
}: {
  partners?: PrintPartner[] | null;
}) {
  const items = publicPrintPartners(partners);
  if (!items.length) return null;

  return (
    <section
      className="gallery-pad-x gallery-pad-x-md mx-auto max-w-[var(--public-max)] pb-2 pt-10"
      aria-label="Print"
    >
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">
        Print
      </p>
      <ul className="mt-4 space-y-4">
        {items.map((p) => (
          <li key={p.id}>
            <a
              href={p.url.trim()}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center text-sm font-medium text-ink underline-offset-4 hover:underline"
            >
              {p.name.trim()}
            </a>
            {p.note?.trim() ? (
              <p className="mt-0.5 text-sm text-muted">{p.note.trim()}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
