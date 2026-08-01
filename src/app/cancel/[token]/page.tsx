"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { StudioMark } from "@/components/brand/StudioMark";
import { InstallHintDock } from "@/components/pwa/InstallHintDock";
import { PublicShell } from "@/components/shells/PublicShell";
import { PublicSoftFailureContact } from "@/components/public/PublicSoftFailureContact";
import { PublicSuccess } from "@/components/public/PublicSuccess";
import {
  Button,
  EmptyState,
  Field,
  Input,
  Label,
  SegmentedControl,
  Textarea,
} from "@/components/ui";
import { publicStudioShellProps } from "@/lib/public-studio-shell";
import type { StudioTheme } from "@/lib/types";

type Mode = "reschedule" | "cancel";

function localInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PublicCancelPage() {
  const { token } = useParams<{ token: string }>();
  const [studioName, setStudioName] = useState("");
  const [studioTheme, setStudioTheme] = useState<StudioTheme | null>(null);
  const [name, setName] = useState("");
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [canCancel, setCanCancel] = useState(false);
  const [canRequestReschedule, setCanRequestReschedule] = useState(false);
  const [blockReason, setBlockReason] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("reschedule");
  const [reason, setReason] = useState("");
  const [preferredLocal, setPreferredLocal] = useState("");
  const [done, setDone] = useState<"cancel" | "reschedule" | null>(null);
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
      setStudioName(data.studioName || data.studio?.name || "");
      setStudioTheme(data.studio?.theme ?? null);
      setName(data.project?.name || "");
      setStartsAt(data.startsAt || null);
      const cancelOk = Boolean(data.canCancel);
      const rescheduleOk = Boolean(data.canRequestReschedule);
      setCanCancel(cancelOk);
      setCanRequestReschedule(rescheduleOk);
      setBlockReason(data.blockReason || null);
      setMode(rescheduleOk ? "reschedule" : "cancel");
      if (data.startsAt) {
        setPreferredLocal(localInputValue(data.startsAt));
      }
    })();
  }, [token]);

  const shell = publicStudioShellProps(studioTheme);

  const modeOptions = useMemo(() => {
    const opts: { id: Mode; label: string }[] = [];
    if (canRequestReschedule) opts.push({ id: "reschedule", label: "Reschedule" });
    if (canCancel) opts.push({ id: "cancel", label: "Cancel" });
    return opts;
  }, [canCancel, canRequestReschedule]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const action = mode === "reschedule" ? "reschedule" : "cancel";
    const payload: {
      action: string;
      reason: string;
      preferredStartsAt?: string;
    } = { action, reason };
    if (action === "reschedule" && preferredLocal) {
      const ms = Date.parse(preferredLocal);
      if (!Number.isNaN(ms)) {
        payload.preferredStartsAt = new Date(ms).toISOString();
      }
    }
    const res = await fetch(`/api/public/cancel/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Could not submit");
      return;
    }
    setDone(action);
  }

  if (loading) {
    return (
      <PublicShell {...shell}>
        <EmptyState
          variant="loading"
          title="Loading…"
          className="py-16 text-center"
        />
      </PublicShell>
    );
  }

  if (error && !studioName) {
    return (
      <PublicShell {...shell}>
        <EmptyState
          variant="error"
          title={error}
          className="items-center text-center"
        />
      </PublicShell>
    );
  }

  if (done === "reschedule") {
    return (
      <PublicShell {...shell}>
        <PublicSuccess title="Request sent">
          <p>{studioName} will confirm a new time.</p>
        </PublicSuccess>
      </PublicShell>
    );
  }

  if (done === "cancel") {
    return (
      <PublicShell {...shell}>
        <PublicSuccess title="Request canceled">
          <p>{studioName} has been notified.</p>
        </PublicSuccess>
      </PublicShell>
    );
  }

  const showForm = canCancel || canRequestReschedule;

  return (
    <PublicShell {...shell}>
      <InstallHintDock storageKey={`aura-install-dismiss-cancel-${token}`} />
      <div className="install-hint-pad mx-auto max-w-md py-12 sm:py-16">
        {studioName ? (
          <StudioMark name={studioName} tone="dark" className="mb-2" />
        ) : null}
        <h1 className="font-display text-3xl">Change or cancel</h1>
        <p className="mt-2 break-words text-muted">
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

        {!showForm ? (
          <>
            <p className="mt-8 text-sm text-muted">
              {blockReason ||
                error ||
                "This booking can no longer be changed here."}
            </p>
            {studioName ? (
              <PublicSoftFailureContact
                studioName={studioName}
                source="other"
                cancelToken={token}
                context={blockReason || name || "Change or cancel"}
              />
            ) : null}
          </>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            {modeOptions.length > 1 ? (
              <SegmentedControl
                ariaLabel="Change or cancel"
                options={modeOptions}
                value={mode}
                onChange={setMode}
              />
            ) : null}

            {mode === "reschedule" && canRequestReschedule ? (
              <>
                {!canCancel && blockReason ? (
                  <p className="text-sm text-muted">{blockReason}</p>
                ) : null}
                <Field className="min-w-0 max-w-full">
                  <Label htmlFor="preferred">Preferred time</Label>
                  <Input
                    id="preferred"
                    type="datetime-local"
                    value={preferredLocal}
                    onChange={(e) => setPreferredLocal(e.target.value)}
                    className="min-h-11 min-w-0 max-w-full"
                  />
                </Field>
                <Field>
                  <Label htmlFor="reason">Message</Label>
                  <Textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                    rows={4}
                  />
                </Field>
                {error ? <p className="text-sm text-danger">{error}</p> : null}
                <Button type="submit" tone="accent" className="min-h-11 w-full">
                  Request new time
                </Button>
              </>
            ) : null}

            {mode === "cancel" && canCancel ? (
              <>
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
              </>
            ) : null}
          </form>
        )}
      </div>
    </PublicShell>
  );
}
