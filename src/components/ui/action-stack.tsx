"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { cn } from "@/lib/cn";

export type ActionStackItem = {
  id: string;
  label: string;
  onClick?: () => void;
  href?: string;
  external?: boolean;
  tone?: NonNullable<ButtonProps["tone"]>;
  pending?: boolean;
  pendingLabel?: string;
  disabled?: boolean;
};

function ActionControl({
  item,
  className,
}: {
  item: ActionStackItem;
  className?: string;
}) {
  const tone = item.tone || (item.href ? "neutral" : "neutral");
  if (item.href) {
    return (
      <ButtonLink
        href={item.href}
        tone={tone === "accent" || tone === "ghost" || tone === "danger" || tone === "neutral" ? tone : "neutral"}
        className={cn("min-h-11 w-full", className)}
        {...(item.external
          ? { target: "_blank", rel: "noreferrer" }
          : {})}
      >
        {item.label}
      </ButtonLink>
    );
  }
  return (
    <Button
      type="button"
      tone={tone}
      className={cn("min-h-11 w-full", className)}
      pending={item.pending}
      pendingLabel={item.pendingLabel}
      disabled={item.disabled}
      onClick={item.onClick}
    >
      {item.label}
    </Button>
  );
}

function MoreMenu({
  label,
  items,
}: {
  label: string;
  items: ActionStackItem[];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative sm:hidden">
      <Button
        type="button"
        tone="ghost"
        className="min-h-11 w-full"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
      </Button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="mt-2 flex flex-col gap-2 rounded-md border border-line bg-surface p-2 shadow-md"
        >
          {items.map((item) => (
            <div
              key={item.id}
              role="none"
              onClick={() => {
                /* close after choose; href navigation still works */
                window.setTimeout(() => setOpen(false), 0);
              }}
            >
              <ActionControl item={item} />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Primary action + overflow “More” below `sm`; full stack from `sm` (AURA-088).
 */
export function ActionStack({
  actions,
  primaryId,
  moreLabel = "More",
  className,
}: {
  actions: ActionStackItem[];
  /** Defaults to first accent action, else first item. */
  primaryId?: string;
  moreLabel?: string;
  className?: string;
}) {
  const items = actions.filter(Boolean);
  if (!items.length) return null;

  const primary =
    items.find((a) => a.id === primaryId) ||
    items.find((a) => a.tone === "accent") ||
    items[0];
  const secondary = items.filter((a) => a.id !== primary.id);

  return (
    <div className={cn("flex w-full min-w-0 flex-col gap-2", className)}>
      <ActionControl item={{ ...primary, tone: primary.tone || "accent" }} />
      {secondary.length ? (
        <>
          <div className="hidden flex-col gap-2 sm:flex">
            {secondary.map((item) => (
              <ActionControl key={item.id} item={item} />
            ))}
          </div>
          <MoreMenu label={moreLabel} items={secondary} />
        </>
      ) : null}
    </div>
  );
}
