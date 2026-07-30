"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Button, Field, Label, PageHeader, Select } from "@/components/ui";
import { clientLogout } from "@/lib/client-logout";
import { cn } from "@/lib/cn";
import {
  SETTINGS_LAST_SECTION_KEY,
  SETTINGS_SECTIONS,
  settingsSectionFromPathname,
  type SettingsSectionId,
} from "@/lib/settings/nav";

function rememberSection(id: SettingsSectionId) {
  try {
    localStorage.setItem(SETTINGS_LAST_SECTION_KEY, id);
  } catch {
    /* ignore */
  }
}

export function SettingsShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const active = settingsSectionFromPathname(pathname) ?? "overview";

  return (
    <div className="min-w-0">
      <PageHeader
        eyebrow="Studio"
        title="Settings"
        actions={
          <Button
            tone="ghost"
            className="w-full sm:w-auto"
            onClick={async () => {
              await clientLogout();
              router.push("/admin/login");
            }}
          >
            Log out
          </Button>
        }
      />

      <div className="flex min-w-0 flex-col gap-6 md:flex-row md:gap-8">
        <nav
          className="hidden w-44 shrink-0 flex-col gap-1 md:flex"
          aria-label="Settings"
        >
          {SETTINGS_SECTIONS.map((section) => {
            const selected = active === section.id;
            return (
              <Link
                key={section.id}
                href={section.href}
                onClick={() => rememberSection(section.id)}
                className={cn(
                  "flex min-h-11 items-center rounded-md px-3 text-sm no-underline transition-colors",
                  selected
                    ? "bg-line/60 font-medium text-ink"
                    : "text-muted hover:bg-line/40 hover:text-ink",
                )}
              >
                {section.label}
              </Link>
            );
          })}
        </nav>

        <div className="md:hidden">
          <Field>
            <Label htmlFor="settings-section">Section</Label>
            <Select
              id="settings-section"
              value={active}
              onChange={(e) => {
                const id = e.target.value as SettingsSectionId;
                rememberSection(id);
                const next = SETTINGS_SECTIONS.find((s) => s.id === id);
                if (next) router.push(next.href);
              }}
            >
              {SETTINGS_SECTIONS.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
