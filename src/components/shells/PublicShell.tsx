import type { CSSProperties, ReactNode } from "react";
import { EnsureKitFonts } from "@/components/fonts/EnsureKitFonts";
import { cn } from "@/lib/cn";
import type {
  FontPresetId,
  GalleryDensityPreference,
  GalleryMotionPreference,
} from "@/lib/types";

export function PublicShell({
  children,
  footer,
  bare,
  className,
  style,
  fontPreset,
  galleryMotion,
  galleryDensity,
}: {
  children: ReactNode;
  footer?: ReactNode;
  /** Skip default main padding — for custom full-bleed layouts. */
  bare?: boolean;
  className?: string;
  style?: CSSProperties;
  /** Loads kit faces beyond root Fraunces/Figtree when needed (AURA-398). */
  fontPreset?: FontPresetId | string | null;
  /** Applies motion CSS tokens (AURA-252). */
  galleryMotion?: GalleryMotionPreference;
  /** Applies density spacing tokens (AURA-252). */
  galleryDensity?: GalleryDensityPreference;
}) {
  return (
    <div
      className={cn(
        /* Inline-size container — @sm / cqw; cqh falls back to viewport (AURA-439). */
        "@container min-h-full min-w-0 overflow-x-clip bg-canvas text-ink",
        className,
      )}
      style={style}
      data-gallery-motion={galleryMotion || undefined}
      data-gallery-density={galleryDensity || undefined}
    >
      <EnsureKitFonts preset={fontPreset} />
      {bare ? (
        children
      ) : (
        <main className="shell-pad mx-auto w-full max-w-[var(--public-max)] animate-enter pt-[max(2.5rem,var(--safe-inset-top))] pb-[max(2.5rem,var(--safe-inset-bottom))] @sm:pt-[max(3.5rem,var(--safe-inset-top))] @sm:pb-[max(3.5rem,var(--safe-inset-bottom))]">
          {children}
        </main>
      )}
      {footer ? (
        <footer className="border-t border-line">
          <div className="shell-pad mx-auto max-w-[var(--public-max)] py-8 pb-[calc(var(--install-hint-clearance,0px)+max(2rem,var(--safe-inset-bottom)))] text-sm text-muted">
            {footer}
          </div>
        </footer>
      ) : null}
    </div>
  );
}
