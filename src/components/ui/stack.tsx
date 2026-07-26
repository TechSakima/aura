import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

export function Stack({
  className,
  gap = "gap-4",
  ...props
}: HTMLAttributes<HTMLDivElement> & { gap?: string }) {
  return <div className={cn("flex flex-col", gap, className)} {...props} />;
}

export function Cluster({
  className,
  gap = "gap-3",
  ...props
}: HTMLAttributes<HTMLDivElement> & { gap?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center", gap, className)} {...props} />
  );
}
