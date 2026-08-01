"use client";

import { FormEvent, useRef, useState } from "react";
import { format } from "date-fns";
import { Button, Checkbox, Field, Input, Label } from "@/components/ui";
import { useVisualViewportFrame } from "@/lib/use-visual-viewport-frame";

export type ContractPublicViewProps = {
  title: string;
  body: string;
  studioName?: string;
  status: string;
  /** Admin draft preview — same layout, signing disabled. */
  preview?: boolean;
  signerName?: string;
  signedAt?: string;
  signedDate?: string;
  onSign?: (input: {
    signerName: string;
    signedDate: string;
    acknowledgedTerms: true;
  }) => Promise<{ ok: true; signedAt: string } | { ok: false; error: string }>;
};

export function ContractPublicView({
  title,
  body,
  studioName,
  status,
  preview = false,
  signerName: initialSignerName = "",
  signedAt,
  signedDate: savedSignedDate,
  onSign,
}: ContractPublicViewProps) {
  const [name, setName] = useState(initialSignerName);
  const [signedDate, setSignedDate] = useState(
    () => savedSignedDate || new Date().toISOString().slice(0, 10),
  );
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [completedAt, setCompletedAt] = useState(signedAt);
  const [completedDate, setCompletedDate] = useState(savedSignedDate);
  const [localStatus, setLocalStatus] = useState(status);
  const signChromeRef = useRef<HTMLDivElement>(null);

  const isCompleted = localStatus === "completed";
  const showSignChrome = !preview && !isCompleted;
  /* Pin sticky Sign above iOS keyboard (AURA-466 / AURA-457). */
  useVisualViewportFrame(showSignChrome, signChromeRef);
  const displayDate =
    completedDate ||
    (completedAt ? format(new Date(completedAt), "MMM d, yyyy") : null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (preview || !onSign) return;
    if (!acknowledged) {
      setError("Confirm you have read and agree to the terms.");
      return;
    }
    setBusy(true);
    setError("");
    const result = await onSign({
      signerName: name,
      signedDate,
      acknowledgedTerms: true,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setLocalStatus("completed");
    setCompletedAt(result.signedAt);
    setCompletedDate(signedDate);
  }

  return (
    <div className="mx-auto min-w-0 max-w-2xl">
      {preview ? (
        <p className="mb-4 text-xs uppercase tracking-[0.14em] text-muted">
          Preview
        </p>
      ) : null}
      {studioName ? (
        <p className="min-w-0 break-words text-sm tracking-wide text-muted uppercase">
          {studioName}
        </p>
      ) : null}
      <h1 className="mt-2 max-w-full min-w-0 break-words font-display text-4xl">
        {title || "Contract"}
      </h1>
      <div className="prose mt-8 min-w-0 max-w-full break-words whitespace-pre-wrap text-ink">
        {body}
      </div>

      {isCompleted ? (
        <div className="mt-10 space-y-3 border-t border-line pt-8">
          <p className="text-muted">Agreement signed.</p>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">Signed by</dt>
              <dd className="mt-1 break-words font-display text-2xl italic">
                {name}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Date</dt>
              <dd className="mt-1">{displayDate || "—"}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <>
          {showSignChrome ? (
            <div
              ref={signChromeRef}
              /* top/left/w/h overridden by visualViewport (AURA-466). */
              className="pointer-events-none fixed top-0 left-0 z-40 h-full w-full print:hidden desk:hidden"
            >
              <div className="pointer-events-auto absolute inset-x-0 border-t border-line bg-canvas/95 py-3 pl-[max(1rem,var(--safe-inset-left))] pr-[max(1rem,var(--safe-inset-right))] pb-[max(0.75rem,var(--safe-inset-bottom))] backdrop-blur bottom-[var(--install-hint-clearance,0px)]">
                <div className="mx-auto flex max-w-2xl min-w-0 items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-sm text-muted">
                    {acknowledged ? "Ready to sign" : "Read & agree below"}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    className="shrink-0"
                    disabled={busy || !acknowledged}
                    onClick={() =>
                      document
                        .getElementById("sign-contract-form")
                        ?.scrollIntoView({ behavior: "smooth", block: "end" })
                    }
                  >
                    Sign
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
          <form
            id="sign-contract-form"
            onSubmit={onSubmit}
            className={
              preview
                ? "mt-10 space-y-5 border-t border-line pt-8"
                : "mt-10 space-y-5 border-t border-line pt-8 pb-[calc(var(--install-hint-clearance,0px)+var(--safe-inset-bottom)+6rem)] desk:pb-[calc(var(--install-hint-clearance,0px)+var(--safe-inset-bottom)+1.5rem)]"
            }
          >
            <Field>
              <Label htmlFor="signed-date">Date</Label>
              <Input
                id="signed-date"
                type="date"
                value={signedDate}
                onChange={(e) => setSignedDate(e.target.value)}
                required
                disabled={preview}
              />
            </Field>
            <Field>
              <Label htmlFor="name">Full legal name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                disabled={preview}
              />
            </Field>
            <p className="break-words font-display text-3xl italic text-ink/80">
              {name.trim() || "Your signature"}
            </p>
            <label className="flex min-h-11 items-start gap-3 text-sm">
              <Checkbox
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-1"
                disabled={preview}
              />
              <span>I have read this agreement and agree to its terms.</span>
            </label>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            {!preview ? (
              <Button type="submit" disabled={busy || !acknowledged}>
                {busy ? "Signing…" : "Sign agreement"}
              </Button>
            ) : null}
          </form>
        </>
      )}
    </div>
  );
}
