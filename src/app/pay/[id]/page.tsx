"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { StudioMark } from "@/components/brand/StudioMark";
import { PublicSoftFailureContact } from "@/components/public/PublicSoftFailureContact";
import { PublicSuccess } from "@/components/public/PublicSuccess";
import { InstallHint } from "@/components/pwa/InstallHint";
import { PublicShell } from "@/components/shells/PublicShell";
import { Button, Field, Input, Label } from "@/components/ui";
import { grossUpAmount } from "@/lib/stripe-fees";

export default function PublicPayPage() {
  const params = useParams<{ id: string }>();
  const [link, setLink] = useState<{
    title: string;
    description?: string;
    mode: string;
    amount?: number;
    minAmount?: number;
    maxAmount?: number;
    studioName?: string;
    feePreview?: {
      grossAmount: number;
      processingFee: number;
      netAmount: number;
    };
  } | null>(null);
  const [amount, setAmount] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [done, setDone] = useState(false);
  const [paidGross, setPaidGross] = useState<number | null>(null);
  const [canceled, setCanceled] = useState(false);
  const [checkoutReady, setCheckoutReady] = useState(true);
  const [pending, setPending] = useState(false);
  /** Stays true after Checkout URL — no second session while navigating (AURA-150). */
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState("");
  const submitLock = useRef(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("paid") === "1") {
      setDone(true);
      const raw = q.get("amount");
      const n = raw != null ? Number(raw) : NaN;
      if (Number.isFinite(n) && n > 0) setPaidGross(n);
    }
    if (q.get("canceled") === "1") setCanceled(true);

    fetch(`/api/public/pay/${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else {
          setLink({
            ...d.paymentLink,
            studioName: d.studioName,
            feePreview: d.feePreview,
          });
          setCheckoutReady(d.checkoutReady !== false);
          if (d.paymentLink?.amount) setAmount(String(d.paymentLink.amount));
        }
      })
      .catch(() => setError("Could not load payment link"));
  }, [params.id]);

  const busy = pending || redirecting;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy || !checkoutReady || submitLock.current) return;
    submitLock.current = true;
    setError("");
    setCanceled(false);
    setPending(true);
    try {
      const res = await fetch(`/api/public/pay/${params.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          email,
          name,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPending(false);
        submitLock.current = false;
        setError(String(data.error || "Payment failed"));
        return;
      }
      if (data.checkoutUrl) {
        setRedirecting(true);
        window.location.assign(data.checkoutUrl as string);
        return;
      }
      setPending(false);
      submitLock.current = false;
      setError("Could not start checkout. Try again shortly.");
    } catch {
      setPending(false);
      submitLock.current = false;
      setError("Could not start checkout. Try again shortly.");
    }
  }

  if (error && !link) {
    return (
      <PublicShell>
        <p className="py-16 text-center text-muted">{error}</p>
      </PublicShell>
    );
  }
  if (!link) {
    return (
      <PublicShell>
        <p className="py-16 text-center text-muted">Loading…</p>
      </PublicShell>
    );
  }
  if (done) {
    return (
      <PublicShell>
        <PublicSuccess title="Payment received">
          {link.studioName ? (
            <p>Payment to {link.studioName}</p>
          ) : null}
          {paidGross != null ? (
            <p className="text-lg text-ink">Paid ${paidGross.toFixed(2)}</p>
          ) : null}
        </PublicSuccess>
      </PublicShell>
    );
  }

  let feePreview = link.mode === "fixed" ? link.feePreview ?? null : null;
  if (!feePreview) {
    const net = Number(amount);
    if (Number.isFinite(net) && net > 0) feePreview = grossUpAmount(net);
  }

  const payLabel = link.studioName
    ? `Pay ${link.studioName}`
    : "Pay now";

  return (
    <PublicShell>
      <div className="pointer-events-none fixed inset-x-0 z-40 shell-pad bottom-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-md">
          <InstallHint storageKey={`aura-install-dismiss-pay-${params.id}`} />
        </div>
      </div>
      <div className="mx-auto max-w-md">
        {link.studioName ? (
          <StudioMark name={link.studioName} tone="dark" className="mb-2" />
        ) : null}
        <h1 className="font-display text-4xl">{link.title}</h1>
        {link.studioName ? (
          <p className="mt-2 text-sm text-muted">Payment to {link.studioName}</p>
        ) : null}
        {link.description ? (
          <p className="mt-2 text-muted">{link.description}</p>
        ) : null}
        {canceled ? (
          <p className="mt-4 border border-line bg-surface px-4 py-3 text-sm text-muted">
            Checkout canceled. You can try again.
          </p>
        ) : null}
        {!checkoutReady ? (
          <>
            <p className="mt-4 text-sm text-muted">
              Payments aren’t available yet.
            </p>
            {link.studioName ? (
              <PublicSoftFailureContact
                studioName={link.studioName}
                source="other"
                paymentLinkId={params.id}
                context={link.title || "Payment"}
              />
            ) : null}
          </>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <Field>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={busy}
              />
            </Field>
            <Field>
              <Label htmlFor="email">Email for receipt</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={busy}
              />
            </Field>
            <Field>
              <Label htmlFor="amount">
                {link.mode === "customer_chooses" &&
                link.minAmount != null &&
                link.maxAmount != null
                  ? `Amount ($${link.minAmount}–$${link.maxAmount})`
                  : "Amount"}
              </Label>
              <Input
                id="amount"
                type="number"
                min={link.minAmount || 1}
                max={link.maxAmount}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={link.mode === "fixed" || busy}
                required
              />
            </Field>
            {feePreview ? (
              <p className="text-sm text-muted">
                You’ll be charged ${feePreview.grossAmount.toFixed(2)} (includes
                card fee).
              </p>
            ) : null}
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <Button
              type="submit"
              className="w-full min-h-11"
              pending={busy}
              pendingLabel={
                redirecting ? "Redirecting…" : "Starting checkout…"
              }
              disabled={busy}
            >
              {payLabel}
            </Button>
          </form>
        )}
      </div>
    </PublicShell>
  );
}
