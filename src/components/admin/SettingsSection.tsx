"use client";

import { FormEvent, useEffect, useState } from "react";
import { useUnsavedChangesGuard } from "@/lib/hooks/use-unsaved-changes";
import {
  Button,
  ButtonLink,
  Card,
  EmptyState,
  Field,
  Label,
  Select,
  useToast,
} from "@/components/ui";

import { mutateJson } from "@/lib/client/mutation";
import {
  DATE_FORMATS,
  formatStudioDate,
  isDateFormat,
} from "@/lib/date-format";
import type { SettingsSectionId } from "@/lib/settings/nav";
import {
  isValidIanaTimeZone,
  timeZoneRegions,
  timeZoneSelectOptions,
} from "@/lib/timezones";
import type { DateFormat } from "@/lib/types";

/** Remaining mega-page section until Studio extract (AURA-328 area). */
export function SettingsSection({ section }: { section: SettingsSectionId }) {
  const { push } = useToast();
  const [timeZone, setTimeZone] = useState("America/Denver");
  const [dateFormat, setDateFormat] = useState<DateFormat>("mm/dd/yyyy");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [studioDirty, setStudioDirty] = useState(false);
  const sectionDirty = section === "studio" ? studioDirty : false;
  useUnsavedChangesGuard(sectionDirty);

  async function load() {
    const res = await fetch("/api/studio");
    setLoading(false);
    if (!res.ok) {
      push("Could not load settings", "danger");
      return;
    }
    const data = await res.json();
    {
      const tz = data.studio.timeZone || "America/Denver";
      setTimeZone(isValidIanaTimeZone(tz) ? tz : "America/Denver");
    }
    {
      const df = data.studio.dateFormat || "mm/dd/yyyy";
      setDateFormat(isDateFormat(df) ? df : "mm/dd/yyyy");
    }
    setStudioDirty(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function saveStudio(e?: FormEvent) {
    e?.preventDefault();
    setSaving(true);
    try {
      const result = await mutateJson(
        "/api/studio",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ section: "studio", timeZone, dateFormat }),
        },
        { action: "save" },
      );
      if (!result.ok) {
        push(result.errorMessage, "danger");
        return;
      }
      setStudioDirty(false);
      push("Studio saved", "success");
    } finally {
      setSaving(false);
    }
  }

  const tzOptions = timeZoneSelectOptions(timeZone);

  if (section !== "studio") {
    return null;
  }

  return (
    <div>
      {loading ? (
        <EmptyState variant="loading" title="Loading settings…" />
      ) : null}

      <div className={loading ? "hidden" : "min-w-0 space-y-8"}>
        <Card className="min-w-0 p-5">
          <h2 className="mb-1 font-display text-2xl">Studio</h2>
          <p className="mb-4 text-sm text-muted">
            Time zone and date format.
          </p>
          <form onSubmit={saveStudio} className="space-y-4">
            <div className="rounded-md border border-line px-3 py-3">
              <p className="text-sm text-muted">
                Watermark and gallery defaults live under Delivery.
              </p>
              <ButtonLink
                href="/admin/settings/delivery"
                tone="ghost"
                className="mt-2 w-full sm:w-auto"
              >
                Delivery defaults
              </ButtonLink>
            </div>
            <Field>
              <Label htmlFor="tz">Time zone</Label>
              <Select
                id="tz"
                value={timeZone}
                onChange={(e) => {
                  setTimeZone(e.target.value);
                  setStudioDirty(true);
                }}
              >
                {timeZoneRegions(tzOptions).map((region) => (
                  <optgroup key={region} label={region}>
                    {tzOptions
                      .filter((z) => z.region === region)
                      .map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.label}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </Select>
            </Field>
            <Field>
              <Label htmlFor="df">Date format</Label>
              <Select
                id="df"
                value={dateFormat}
                onChange={(e) => {
                  const next = e.target.value;
                  if (!isDateFormat(next)) return;
                  setDateFormat(next);
                  setStudioDirty(true);
                }}
              >
                {DATE_FORMATS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </Select>
              <p className="mt-2 text-sm text-muted">
                Preview: {formatStudioDate(new Date(), dateFormat, timeZone)}
              </p>
            </Field>
            <Button
              type="submit"
              pending={saving}
              pendingLabel="Saving…"
              className="w-full sm:w-auto"
            >
              Save studio
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
