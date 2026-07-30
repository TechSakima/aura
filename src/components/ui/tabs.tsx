"use client";

import { cn } from "@/lib/cn";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export type TabItem = {
  id: string;
  label: string;
  disabled?: boolean;
  done?: boolean;
};

export function Tabs({
  tabs,
  value,
  onChange,
  variant = "default",
  "aria-label": ariaLabel,
}: {
  tabs: TabItem[];
  value: string;
  onChange: (id: string) => void;
  /** `progress` — wizard steps: desktop tabs + mobile progress/jump (AURA-215/067). */
  variant?: "default" | "progress";
  "aria-label"?: string;
}) {
  if (variant === "progress") {
    const idx = Math.max(
      0,
      tabs.findIndex((t) => t.id === value),
    );
    const active = tabs[idx];
    const jumpable = tabs.filter((t) => !t.disabled);

    return (
      <div className="space-y-4">
        <div className="space-y-3 md:hidden">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted">
              Step {idx + 1} of {tabs.length}
            </p>
            <p className="mt-1 font-medium text-ink">{active?.label}</p>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-line">
              <div
                className="h-full bg-ink transition-all"
                style={{
                  width: `${((idx + 1) / Math.max(tabs.length, 1)) * 100}%`,
                }}
              />
            </div>
          </div>
          {jumpable.length > 1 ? (
            <div>
              <Label htmlFor="wizard-step-jump" className="sr-only">
                Jump to step
              </Label>
              <Select
                id="wizard-step-jump"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                aria-label={ariaLabel || "Jump to step"}
              >
                {jumpable.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                    {t.done ? " · Done" : ""}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
        </div>

        <nav aria-label={ariaLabel} className="hidden md:block">
          <div
            className="flex flex-wrap gap-1 border-b border-line"
            role="tablist"
          >
            {tabs.map((tab, i) => {
              const isActive = value === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  disabled={tab.disabled}
                  onClick={() => onChange(tab.id)}
                  className={cn(
                    "-mb-px inline-flex min-h-11 items-center gap-2 border-b-2 px-3 text-sm transition-colors",
                    isActive && "border-ink text-ink",
                    !isActive &&
                      tab.done &&
                      "border-transparent text-ink/80",
                    !isActive &&
                      !tab.done &&
                      !tab.disabled &&
                      "border-transparent text-muted hover:text-ink",
                    tab.disabled &&
                      "cursor-not-allowed border-transparent text-muted/35",
                  )}
                >
                  <span className="text-xs text-muted">{i + 1}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    );
  }

  return (
    <div
      className="flex flex-wrap gap-1 border-b border-line"
      role="tablist"
      aria-label={ariaLabel}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={value === tab.id}
          disabled={tab.disabled}
          className={cn(
            "min-h-11 px-3 text-sm font-medium transition-colors",
            tab.disabled && "cursor-not-allowed opacity-40",
            value === tab.id
              ? "border-b-2 border-accent text-ink"
              : "text-muted hover:text-ink",
          )}
          onClick={() => {
            if (!tab.disabled) onChange(tab.id);
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
