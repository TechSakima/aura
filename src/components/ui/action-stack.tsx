"use client";

import { useId, useState } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Sheet } from "@/components/ui/sheet";
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
        tone={
          tone === "accent" ||
          tone === "ghost" ||
          tone === "danger" ||
          tone === "neutral"
            ? tone
            : "neutral"
        }
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
  className,
}: {
  label: string;
  items: ActionStackItem[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const menuId = useId();

  if (!items.length) return null;

  return (
    <div className={className}>
      <Button
        type="button"
        tone="ghost"
        className="min-h-11 w-full"
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
      >
        {label}
      </Button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        id={menuId}
      >
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                window.setTimeout(() => setOpen(false), 0);
              }}
            >
              <ActionControl item={item} />
            </div>
          ))}
        </div>
      </Sheet>
    </div>
  );
}

/**
 * Primary action + overflow “More” below `sm`; full stack from `sm` (AURA-088).
 * Pass `menuIds` to keep destructive actions behind More at every breakpoint (AURA-127).
 * More opens a portaled Sheet so it clears the admin tab bar (AURA-425).
 */
export function ActionStack({
  actions,
  primaryId,
  moreLabel = "More",
  menuIds,
  className,
}: {
  actions: ActionStackItem[];
  /** Defaults to first accent action, else first item. */
  primaryId?: string;
  moreLabel?: string;
  /** Always shown inside More (all breakpoints) — e.g. Archive / Delete. */
  menuIds?: string[];
  className?: string;
}) {
  const items = actions.filter(Boolean);
  if (!items.length) return null;

  const primary =
    items.find((a) => a.id === primaryId) ||
    items.find((a) => a.tone === "accent") ||
    items[0]!;
  const rest = items.filter((a) => a.id !== primary.id);
  const menuSet = new Set(menuIds || []);
  const alwaysMenu = rest.filter((a) => menuSet.has(a.id));
  const inlineSecondary = rest.filter((a) => !menuSet.has(a.id));
  const mobileMenuItems = [...inlineSecondary, ...alwaysMenu];

  return (
    <div className={cn("flex w-full min-w-0 flex-col gap-2", className)}>
      <ActionControl item={{ ...primary, tone: primary.tone || "accent" }} />
      {inlineSecondary.length ? (
        <div className="hidden flex-col gap-2 sm:flex">
          {inlineSecondary.map((item) => (
            <ActionControl key={item.id} item={item} />
          ))}
        </div>
      ) : null}
      <MoreMenu
        label={moreLabel}
        items={mobileMenuItems}
        className="sm:hidden"
      />
      <MoreMenu
        label={moreLabel}
        items={alwaysMenu}
        className="hidden sm:block"
      />
    </div>
  );
}
