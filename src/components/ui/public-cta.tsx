import { cn } from "@/lib/cn";
import { Button, type ButtonProps } from "./button";
import { ButtonLink } from "./button-link";

const ctaClass =
  "min-h-11 rounded-none px-6 py-2.5 text-[11px] font-medium uppercase tracking-[0.22em] hover:opacity-100";

/** Editorial CTA on photography / gallery covers (AURA-210). */
export function PublicCta({
  surface = "media",
  className,
  size = "md",
  href,
  children,
  ...props
}: Omit<ButtonProps, "tone"> & {
  /** `media` = on photo; `canvas` = cover-none / light page. */
  surface?: "media" | "canvas";
  /** When set, renders as ButtonLink (valid navigation). */
  href?: string;
}) {
  const surfaceClass =
    surface === "canvas"
      ? "border border-ink bg-transparent text-ink hover:bg-ink hover:text-surface"
      : undefined;

  if (href) {
    return (
      <ButtonLink
        href={href}
        tone={surface === "media" ? "onMedia" : "ghost"}
        size={size}
        className={cn(ctaClass, surfaceClass, className)}
      >
        {children}
      </ButtonLink>
    );
  }

  return (
    <Button
      tone={surface === "media" ? "onMedia" : "ghost"}
      size={size}
      className={cn(ctaClass, surfaceClass, className)}
      {...props}
    >
      {children}
    </Button>
  );
}
