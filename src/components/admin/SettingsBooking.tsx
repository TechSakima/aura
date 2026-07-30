"use client";

import { FormEvent, useEffect, useState } from "react";
import { SessionTypesPanel } from "@/components/admin/SessionTypesPanel";
import {
  Button,
  ButtonLink,
  Card,
  EmptyState,
  Field,
  Input,
  Label,
  Switch,
  useToast,
} from "@/components/ui";
import {
  DEFAULT_BOOKING_DEFAULTS,
  normalizeBookingDefaults,
} from "@/lib/booking-defaults";
import { useUnsavedChangesGuard } from "@/lib/hooks/use-unsaved-changes";

export function SettingsBooking() {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [slug, setSlug] = useState("");
  const [showBooking, setShowBooking] = useState(true);
  const [defaultBufferMinutes, setDefaultBufferMinutes] = useState(
    String(DEFAULT_BOOKING_DEFAULTS.defaultBufferMinutes),
  );
  useUnsavedChangesGuard(dirty);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/studio");
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        push("Could not load booking settings", "danger");
        return;
      }
      const data = await res.json();
      const hp = data.studio.homepage || {};
      const booking = normalizeBookingDefaults(data.studio.bookingDefaults);
      setSlug(hp.slug || "");
      setShowBooking(hp.showBooking !== false);
      setDefaultBufferMinutes(String(booking.defaultBufferMinutes));
      setDirty(false);
      if (
        typeof window !== "undefined" &&
        window.location.hash === "#types"
      ) {
        requestAnimationFrame(() => {
          document.getElementById("types")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [push]);

  async function save(e?: FormEvent) {
    e?.preventDefault();
    setSaving(true);
    const bookingDefaults = normalizeBookingDefaults({
      defaultBufferMinutes: Number(defaultBufferMinutes),
    });
    const res = await fetch("/api/studio", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: "booking",
        homepage: { showBooking },
        bookingDefaults,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      push("Save failed", "danger");
      return;
    }
    setDefaultBufferMinutes(String(bookingDefaults.defaultBufferMinutes));
    setDirty(false);
    push("Booking settings saved", "success");
  }

  if (loading) {
    return <EmptyState variant="loading" title="Loading booking…" />;
  }

  const bookPath = slug ? `/book/${slug}` : "";

  return (
    <div className="space-y-4">
      <Card className="min-w-0 p-5">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="font-display text-2xl">Booking</h2>
            <p className="mt-1 text-sm text-muted">
              Public book link, site CTA, and session types.
            </p>
          </div>
          <ButtonLink
            href="/admin/bookings"
            tone="ghost"
            className="w-full sm:w-auto"
          >
            Booking inbox
          </ButtonLink>
        </div>

        <form onSubmit={save} className="space-y-6">
          <Field>
            <Label>Public book URL</Label>
            {bookPath ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <p className="min-w-0 flex-1 break-all text-sm text-ink">
                  {bookPath}
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    tone="neutral"
                    className="w-full sm:w-auto"
                    onClick={async () => {
                      const url = `${window.location.origin}${bookPath}`;
                      try {
                        await navigator.clipboard.writeText(url);
                        push("Link copied", "success");
                      } catch {
                        push("Could not copy", "danger");
                      }
                    }}
                  >
                    Copy link
                  </Button>
                  <Button
                    type="button"
                    tone="ghost"
                    className="w-full sm:w-auto"
                    onClick={() =>
                      window.open(bookPath, "_blank", "noopener")
                    }
                  >
                    Preview
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted">
                Set a site URL in Website settings first.
              </p>
            )}
            {!slug ? (
              <ButtonLink
                href="/admin/settings/website"
                tone="ghost"
                className="mt-2 w-full sm:w-auto"
              >
                Website settings
              </ButtonLink>
            ) : null}
          </Field>

          <div className="flex min-h-11 items-center justify-between gap-3">
            <div className="min-w-0">
              <Label htmlFor="book-cta">Book button on website</Label>
            </div>
            <Switch
              id="book-cta"
              label="Book button on website"
              checked={showBooking}
              onCheckedChange={(next) => {
                setShowBooking(next);
                setDirty(true);
              }}
            />
          </div>

          <Field>
            <Label htmlFor="book-buffer">Default buffer (minutes)</Label>
            <Input
              id="book-buffer"
              inputMode="numeric"
              value={defaultBufferMinutes}
              onChange={(e) => {
                setDefaultBufferMinutes(
                  e.target.value.replace(/\D/g, "").slice(0, 3),
                );
                setDirty(true);
              }}
            />
            <p className="mt-1 text-xs text-muted">
              Default for new session types. Padding around booked times.
            </p>
          </Field>

          <Button
            type="submit"
            pending={saving}
            pendingLabel="Saving…"
            className="w-full sm:w-auto"
          >
            Save booking
          </Button>
        </form>
      </Card>

      <SessionTypesPanel />
    </div>
  );
}
