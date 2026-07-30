"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  Field,
  Input,
  Label,
  useConfirm,
  useToast,
} from "@/components/ui";
import {
  DEFAULT_LINK_TITLE,
  normalizePaymentDefaults,
} from "@/lib/payment-defaults";
import { useUnsavedChangesGuard } from "@/lib/hooks/use-unsaved-changes";
import { DEFAULT_PAYMENT_CURRENCY } from "@/lib/stripe-fees";

export function SettingsPayments() {
  const { push } = useToast();
  const { confirm } = useConfirm();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [stripeConfigured, setStripeConfigured] = useState(true);
  const [stripeReady, setStripeReady] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [defaultDepositAmount, setDefaultDepositAmount] = useState("");
  const [defaultLinkTitle, setDefaultLinkTitle] = useState(DEFAULT_LINK_TITLE);
  useUnsavedChangesGuard(dirty);

  async function loadConnect() {
    const res = await fetch("/api/payments/connect");
    if (!res.ok) return;
    const data = await res.json().catch(() => ({}));
    setStripeConfigured(data.stripeConfigured !== false);
    setStripeReady(Boolean(data.onboardingComplete));
    setAccountId(
      typeof data.accountId === "string" && data.accountId
        ? data.accountId
        : null,
    );
  }

  async function loadStudio() {
    const res = await fetch("/api/studio");
    if (!res.ok) {
      push("Could not load payments", "danger");
      return;
    }
    const data = await res.json();
    const d = normalizePaymentDefaults(data.studio?.paymentDefaults);
    setDefaultDepositAmount(
      d.defaultDepositAmount != null ? String(d.defaultDepositAmount) : "",
    );
    setDefaultLinkTitle(d.defaultLinkTitle);
    setDirty(false);
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      await Promise.all([loadConnect(), loadStudio()]);
      if (cancelled) return;
      setLoading(false);
      if (typeof window !== "undefined" && window.location.hash === "#defaults") {
        requestAnimationFrame(() => {
          document.getElementById("defaults")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
      }
    }
    void load();
    const q = new URLSearchParams(window.location.search);
    if (q.get("connect") === "return" || q.get("connect") === "refresh") {
      void fetch("/api/payments/connect", { method: "PUT" }).then(() => {
        void loadConnect();
        const url = new URL(window.location.href);
        url.searchParams.delete("connect");
        window.history.replaceState({}, "", url.pathname + url.hash);
      });
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, []);

  async function startConnect() {
    setBusy(true);
    const res = await fetch("/api/payments/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "onboard" }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      push(String(data.error || "Could not enable payments"), "danger");
      return;
    }
    if (data.url) {
      window.location.href = data.url as string;
      return;
    }
    push("Payments ready", "success");
    void loadConnect();
  }

  async function disconnect() {
    const ok = await confirm({
      title: "Disconnect payments?",
      message: "Pay links stop accepting cards until you connect again.",
      confirmLabel: "Disconnect",
      tone: "danger",
    });
    if (!ok) return;
    setBusy(true);
    const res = await fetch("/api/payments/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "disconnect" }),
    });
    setBusy(false);
    if (!res.ok) {
      push("Could not disconnect", "danger");
      return;
    }
    push("Payments disconnected", "success");
    void loadConnect();
  }

  async function saveDefaults(e?: FormEvent) {
    e?.preventDefault();
    setSaving(true);
    const paymentDefaults = normalizePaymentDefaults({
      defaultDepositAmount:
        defaultDepositAmount.trim() === ""
          ? undefined
          : Number(defaultDepositAmount),
      defaultLinkTitle,
    });
    const res = await fetch("/api/studio", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: "payments",
        paymentDefaults: {
          ...paymentDefaults,
          defaultDepositAmount:
            defaultDepositAmount.trim() === ""
              ? null
              : paymentDefaults.defaultDepositAmount,
        },
      }),
    });
    setSaving(false);
    if (!res.ok) {
      push("Save failed", "danger");
      return;
    }
    setDefaultDepositAmount(
      paymentDefaults.defaultDepositAmount != null
        ? String(paymentDefaults.defaultDepositAmount)
        : "",
    );
    setDefaultLinkTitle(paymentDefaults.defaultLinkTitle);
    setDirty(false);
    push("Payment defaults saved", "success");
  }

  if (loading) {
    return <EmptyState variant="loading" title="Loading payments…" />;
  }

  const currencyLabel = DEFAULT_PAYMENT_CURRENCY.toUpperCase();

  return (
    <div className="space-y-4">
      <Card className="min-w-0 p-5">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="font-display text-2xl">Payments</h2>
            <p className="mt-1 text-sm text-muted">
              Card payouts, currency, and deposit defaults.
            </p>
          </div>
          <ButtonLink
            href="/admin/payments"
            tone="ghost"
            className="w-full sm:w-auto"
          >
            Payment links
          </ButtonLink>
        </div>

        <div className="space-y-6">
          <Field>
            <Label>Card payments</Label>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                {!stripeConfigured ? (
                  <Badge tone="neutral">Unavailable</Badge>
                ) : stripeReady ? (
                  <Badge tone="success">On</Badge>
                ) : (
                  <Badge tone="neutral">Not set up</Badge>
                )}
                {accountId && stripeReady ? (
                  <p className="truncate text-xs text-muted">{accountId}</p>
                ) : null}
              </div>
              {stripeConfigured ? (
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <Button
                    type="button"
                    tone={stripeReady ? "neutral" : "accent"}
                    className="min-h-11 w-full sm:w-auto"
                    disabled={busy}
                    onClick={() => void startConnect()}
                  >
                    {stripeReady ? "Manage" : "Enable payments"}
                  </Button>
                  {stripeReady || accountId ? (
                    <Button
                      type="button"
                      tone="ghost"
                      className="min-h-11 w-full sm:w-auto"
                      disabled={busy}
                      onClick={() => void disconnect()}
                    >
                      Disconnect
                    </Button>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-muted">Payments unavailable.</p>
              )}
            </div>
          </Field>

          <Field>
            <Label>Currency</Label>
            <p className="mt-1 text-sm text-ink">{currencyLabel}</p>
            <p className="mt-1 text-xs text-muted">
              All pay links and deposits use {currencyLabel} only.
            </p>
          </Field>
        </div>
      </Card>

      <Card id="defaults" className="min-w-0 scroll-mt-24 p-5">
        <h2 className="font-display text-2xl">Deposit defaults</h2>
        <p className="mt-1 text-sm text-muted">
          Used when a project has no session-type deposit.
        </p>

        <form onSubmit={saveDefaults} className="mt-6 space-y-6">
          <Field>
            <Label htmlFor="pay-deposit">Default deposit ($)</Label>
            <Input
              id="pay-deposit"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              value={defaultDepositAmount}
              onChange={(e) => {
                setDefaultDepositAmount(e.target.value);
                setDirty(true);
              }}
              placeholder="None"
            />
          </Field>

          <Field>
            <Label htmlFor="pay-link-title">Default link title</Label>
            <Input
              id="pay-link-title"
              value={defaultLinkTitle}
              onChange={(e) => {
                setDefaultLinkTitle(e.target.value);
                setDirty(true);
              }}
              required
            />
            <p className="mt-1 text-xs text-muted">
              Prefill for new links on the Payment links page.
            </p>
          </Field>

          <Button
            type="submit"
            pending={saving}
            pendingLabel="Saving…"
            className="w-full sm:w-auto"
          >
            Save defaults
          </Button>
        </form>
      </Card>
    </div>
  );
}
