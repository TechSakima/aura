"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { StudioMark } from "@/components/brand/StudioMark";
import { PublicShell } from "@/components/shells/PublicShell";
import { PublicSuccess } from "@/components/public/PublicSuccess";
import { Button, Field, Label, Textarea } from "@/components/ui";

export default function PublicCancelPage() {
  const { token } = useParams<{ token: string }>();
  const [studioName, setStudioName] = useState("");
  const [name, setName] = useState("");
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [canCancel, setCanCancel] = useState(false);
  const [blockReason, setBlockReason] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/public/cancel/${token}`);
      const data = await res.json().catch(() => ({}));
      setLoading(false);
      if (!res.ok) {
        setError(data.error || "Not found");
        return;
      }
      setStudioName(data.studioName || "");
      setName(data.project?.name || "");
      setStartsAt(data.startsAt || null);
      setCanCancel(Boolean(data.canCancel));
      setBlockReason(data.blockReason || null);
    })();
  }, [token]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch(`/api/public/cancel/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Could not cancel");
      return;
    }
    setDone(true);
  }

  if (loading) {
    return (
      <PublicShell>
        <p className="py-16 text-center text-muted">Loading…</p>
      </PublicShell>
    );
  }

  if (done) {
    return (
      <PublicShell>
        <PublicSuccess title="Request canceled">
          <p>{studioName} has been notified.</p>
        </PublicSuccess>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <div className="mx-auto max-w-md py-12 sm:py-16">
        {studioName ? (
          <StudioMark name={studioName} tone="dark" className="mb-2" />
        ) : null}
        <h1 className="font-display text-3xl">Cancel request</h1>
        <p className="mt-2 text-muted">
          {name}
          {startsAt
            ? ` · ${new Date(startsAt).toLocaleString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}`
            : ""}
        </p>

        {!canCancel ? (
          <p className="mt-8 text-sm text-muted">
            {blockReason || error || "This request can no longer be canceled here."}
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <Field>
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                rows={4}
              />
            </Field>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <Button type="submit" tone="danger" className="min-h-11 w-full">
              Cancel request
            </Button>
          </form>
        )}
      </div>
    </PublicShell>
  );
}
