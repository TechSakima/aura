import { ButtonLink } from "@/components/ui";
import { cn } from "@/lib/cn";
import { resolveSocialNetwork, type SocialNetworkId } from "@/lib/social";
import type { BrandSocialTreatment } from "@/lib/types";

type SocialLink = { label: string; url: string };

function SocialGlyph({
  network,
  className,
}: {
  network: SocialNetworkId;
  className?: string;
}) {
  const common = cn("size-5 shrink-0", className);
  switch (network) {
    case "instagram":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
          <rect
            x="3"
            y="3"
            width="18"
            height="18"
            rx="5"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.75" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
        </svg>
      );
    case "facebook":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={common} aria-hidden>
          <path d="M14 9h3V6h-3c-1.7 0-3 1.3-3 3v2H8v3h3v7h3v-7h3l1-3h-4V9c0-.6.4-1 1-1z" />
        </svg>
      );
    case "x":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={common} aria-hidden>
          <path d="M4 4h4.2l4.1 5.7L17.2 4H20l-6.3 7.2L20.5 20H16.2l-4.5-6.2L7 20H4l6.7-7.6L4 4z" />
        </svg>
      );
    case "tiktok":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={common} aria-hidden>
          <path d="M14 4v10.2a3.2 3.2 0 1 1-2.4-3.1V8.2c1.5.2 2.9.9 4 1.9V4h-1.6zM16.4 4c.4 2.2 2 3.9 4.1 4.3v2.2c-1.5-.1-2.9-.7-4.1-1.7V16a5.2 5.2 0 1 1-5.2-5.2c.3 0 .6 0 .9.1v2.3a2.9 2.9 0 1 0 2 2.8V4h2.3z" />
        </svg>
      );
    case "youtube":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={common} aria-hidden>
          <path d="M22 12.2c0-2.4-.3-4-.8-4.9-.5-.8-1.2-1.3-2.2-1.5C17.2 5.5 12 5.5 12 5.5s-5.2 0-6.9.3c-1 .2-1.7.7-2.2 1.5-.5.9-.8 2.5-.8 4.9s.3 4 .8 4.9c.5.8 1.2 1.3 2.2 1.5 1.7.3 6.9.3 6.9.3s5.2 0 6.9-.3c1-.2 1.7-.7 2.2-1.5.5-.9.8-2.5.8-4.9zM10.5 15.2V9.2l5 3-5 3z" />
        </svg>
      );
    case "pinterest":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={common} aria-hidden>
          <path d="M12 3a9 9 0 0 0-3.3 17.4c-.1-.7-.2-1.8 0-2.6l1.3-5.5s-.3-.7-.3-1.6c0-1.5.9-2.6 2-2.6.9 0 1.4.7 1.4 1.5 0 .9-.6 2.3-.9 3.5-.3 1.1.5 1.9 1.6 1.9 1.9 0 3.2-2.4 3.2-5.3 0-2.2-1.5-3.8-4.2-3.8-3 0-4.9 2.2-4.9 4.7 0 .9.3 1.5.7 2l.2.2-.1.5c0 .2-.2.7-.2.8-.1.2-.2.3-.4.2-1.5-.6-2.2-2.3-2.2-4.2 0-3.1 2.6-6.8 7.8-6.8 4.2 0 6.9 3 6.9 6.3 0 4.3-2.4 7.5-5.9 7.5-1.2 0-2.3-.6-2.7-1.4l-.7 2.8c-.3 1-1 2.2-1.4 2.9A9 9 0 1 0 12 3z" />
        </svg>
      );
    case "linkedin":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={common} aria-hidden>
          <path d="M6.5 9.5H3.7V20h2.8V9.5zM5.1 4a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4zM20.3 20h-2.8v-5.6c0-1.5-.5-2.5-1.8-2.5-1 0-1.5.7-1.8 1.3-.1.2-.1.6-.1.9V20H11V9.5h2.7v1.4c.4-.7 1.2-1.7 3-1.7 2.2 0 3.6 1.4 3.6 4.5V20z" />
        </svg>
      );
    case "vimeo":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={common} aria-hidden>
          <path d="M22 7.2c-.1 2.2-1.6 5.2-4.6 9-3.1 4-5.7 6-7.9 6-1.3 0-2.5-1.2-3.4-3.7L4.5 12c-.7-2.4-1.4-3.6-2.2-3.6-.2 0-.7.3-1.6.9L0 8c1.7-1.5 3.4-2.9 5-4.1C7.2 2.4 8.5 1.8 9.3 1.9c1.9.2 3 1.4 3.5 3.6.5 2.4.8 3.9 1 4.5.7 3 1.5 4.5 2.3 4.5.7 0 1.6-1 2.9-3.1.1-.2.2-.4.3-.6.9-1.5 1.3-2.6 1.2-3.3-.1-.9-.8-1.3-2-1.3a4 4 0 0 0-1.4.3l.5-2.5c1.1-.4 2.2-.6 3.3-.6 2.5.1 3.6 1.4 3.4 3.8z" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
          <path
            d="M10 14a5 5 0 0 0 7.1 0l1.4-1.4a5 5 0 0 0-7.1-7.1L10 6"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <path
            d="M14 10a5 5 0 0 0-7.1 0L5.5 11.4a5 5 0 0 0 7.1 7.1L14 18"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}

/** Social links with brand treatment — text / icons / pills (AURA-233). */
export function SocialLinks({
  links,
  treatment = "text",
  className,
}: {
  links: SocialLink[];
  treatment?: BrandSocialTreatment;
  className?: string;
}) {
  if (!links.length) return null;

  return (
    <ul
      className={cn(
        "flex flex-wrap items-center justify-center gap-2",
        treatment === "text" && "gap-x-4 gap-y-2",
        className,
      )}
    >
      {links.map((s) => {
        const network = resolveSocialNetwork(s.label, s.url);
        if (treatment === "icons") {
          return (
            <li key={`${s.label}-${s.url}`}>
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                aria-label={s.label}
                className="inline-flex size-11 items-center justify-center text-ink no-underline transition hover:text-accent"
              >
                <SocialGlyph network={network} />
              </a>
            </li>
          );
        }
        if (treatment === "pills") {
          return (
            <li key={`${s.label}-${s.url}`}>
              <ButtonLink
                href={s.url}
                target="_blank"
                rel="noreferrer"
                tone="ghost"
                size="sm"
                className="border border-line bg-surface hover:border-ink/30"
              >
                <SocialGlyph network={network} className="size-4" />
                <span>{s.label}</span>
              </ButtonLink>
            </li>
          );
        }
        return (
          <li key={`${s.label}-${s.url}`}>
            <a
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center text-sm text-accent no-underline"
            >
              {s.label}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
