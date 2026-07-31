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
        "min-h-full min-w-0 overflow-x-clip bg-canvas text-ink",
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
        <main className="shell-pad mx-auto w-full max-w-[var(--public-max)] animate-enter pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:pt-[max(3.5rem,env(safe-area-inset-top))] sm:pb-[max(3.5rem,env(safe-area-inset-bottom))]">
          {children}
        </main>
      )}
      {footer ? (
        <footer className="border-t border-line">
          <div className="shell-pad mx-auto max-w-[var(--public-max)] py-8 pb-[max(2rem,env(safe-area-inset-bottom))] text-sm text-muted">
            {footer}
          </div>
        </footer>
      ) : null}
    </div>
  );
}
