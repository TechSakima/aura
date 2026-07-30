"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { PublicShell } from "@/components/shells/PublicShell";
import { Button, Checkbox, Field, Input, Label } from "@/components/ui";

export default function SignContractPage() {
  const params = useParams<{ token: string }>();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState("");
  const [studioName, setStudioName] = useState("");
  const [name, setName] = useState("");
  const [signedDate, setSignedDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [acknowledged, setAcknowledged] = useState(false);
  const [signedAt, setSignedAt] = useState<string | undefined>();
  const [savedSignedDate, setSavedSignedDate] = useState<string | undefined>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/public/contracts/${params.token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else {
          setTitle(d.contract.title);
          setBody(d.contract.body);
          setStatus(d.contract.status);
          setStudioName(d.studio?.name || "");
          if (d.contract.signerName) setName(d.contract.signerName);
          if (d.contract.signedAt) setSignedAt(d.contract.signedAt);
          if (d.contract.signedDate) setSavedSignedDate(d.contract.signedDate);
        }
      });
  }, [params.token]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!acknowledged) {
      setError("Confirm you have read and agree to the terms.");
      return;
    }
    setBusy(true);
    setError("");
    const res = await fetch(`/api/public/contracts/${params.token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        signerName: name,
        signedDate,
        acknowledgedTerms: true,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not sign");
      return;
    }
    setStatus("completed");
    setSignedAt(data.signedAt);
    setSavedSignedDate(signedDate);
  }

  if (error && !title) {
    return (
      <PublicShell>
        <p className="py-16 text-center text-muted">{error}</p>
      </PublicShell>
    );
  }

  const displayDate =
    savedSignedDate ||
    (signedAt ? format(new Date(signedAt), "MMM d, yyyy") : null);

  return (
    <PublicShell>
      <div className="mx-auto max-w-2xl">
        {studioName ? (
          <p className="text-sm tracking-wide text-muted uppercase">
            {studioName}
          </p>
        ) : null}
        <h1 className="mt-2 font-display text-4xl">{title || "Contract"}</h1>
        <div className="prose mt-8 whitespace-pre-wrap text-ink">{body}</div>

        {status === "completed" ? (
          <div className="mt-10 space-y-3 border-t border-line pt-8">
            <p className="text-muted">Agreement signed.</p>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted">Signed by</dt>
                <dd className="mt-1 font-display text-2xl italic">{name}</dd>
              </div>
              <div>
                <dt className="text-muted">Date</dt>
                <dd className="mt-1">{displayDate || "—"}</dd>
              </div>
            </dl>
          </div>
        ) : (
          <>
            {/* Sticky bottom sign CTA on small screens (AURA-044) */}
            <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:hidden">
              <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
                <p className="truncate text-sm text-muted">
                  {acknowledged ? "Ready to sign" : "Read & agree below"}
                </p>
                <Button
                  type="button"
                  size="sm"
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
          <form
            id="sign-contract-form"
            onSubmit={onSubmit}
            className="mt-10 space-y-5 border-t border-line pt-8 pb-24 sm:pb-0"
          >
            <Field>
              <Label htmlFor="signed-date">Date</Label>
              <Input
                id="signed-date"
                type="date"
                value={signedDate}
                onChange={(e) => setSignedDate(e.target.value)}
                required
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
              />
            </Field>
            <p className="font-display text-3xl italic text-ink/80">
              {name.trim() || "Your signature"}
            </p>
            <label className="flex min-h-11 items-start gap-3 text-sm">
              <Checkbox
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-1"
              />
              <span>
                I have read this agreement and agree to its terms.
              </span>
            </label>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <Button type="submit" disabled={busy || !acknowledged}>
              {busy ? "Signing…" : "Sign agreement"}
            </Button>
          </form>
          </>
        )}
      </div>
    </PublicShell>
  );
}
