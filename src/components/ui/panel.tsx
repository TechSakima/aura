import { cn } from "@/lib/cn";
import type { ElementType, HTMLAttributes, ReactNode } from "react";

export type PanelVariant = "static" | "interactive" | "dashed";

const variantClass: Record<PanelVariant, string> = {
  static: "border border-line bg-surface",
  interactive:
    "border border-line bg-surface shadow-sm transition-colors hover:bg-surface-elevated",
  dashed: "border border-dashed border-line",
};

/** Bordered content panel — prefer over ad-hoc `border border-line bg-surface p-4`. */
export function Panel({
  as: Comp = "div",
  variant = "static",
  className,
  children,
  ...props
}: {
  as?: ElementType;
  variant?: PanelVariant;
  className?: string;
  children?: ReactNode;
} & HTMLAttributes<HTMLElement>) {
  return (
    <Comp
      className={cn("rounded-md p-4", variantClass[variant], className)}
      {...props}
    >
      {children}
    </Comp>
  );
}
