import { cn } from "@/lib/cn";
import { resolveMediaUrl } from "@/lib/media-url";

/** Brand mark without a contrasting chip — sized for hero / public pages. */
export function StudioMark({
  logoUrl,
  name,
  className,
  imgClassName,
  tone = "light",
}: {
  logoUrl?: string | null;
  name: string;
  className?: string;
  imgClassName?: string;
  /** light = on dark backgrounds; dark = on light backgrounds */
  tone?: "light" | "dark";
}) {
  const src = resolveMediaUrl(logoUrl);
  if (!src) {
    return (
      <p
        className={cn(
          "mb-4 text-xs uppercase tracking-[0.2em]",
          tone === "light" ? "text-surface/70" : "text-muted",
          className,
        )}
      >
        {name}
      </p>
    );
  }

  return (
    <div className={cn("mb-6", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={name}
        className={cn(
          "h-12 w-auto max-w-[14rem] object-contain sm:h-14 sm:max-w-[16rem]",
          tone === "light" && "drop-shadow-on-media",
          imgClassName,
        )}
      />
    </div>
  );
}
