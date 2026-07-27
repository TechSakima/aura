"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Button,
  Card,
  Field,
  Input,
  Label,
  PageHeader,
  Select,
  useToast,
} from "@/components/ui";
import type { Invoice, PaymentLinkTemplate, PaymentTransaction } from "@/lib/types";

export default function PaymentsPage() {
  const { push } = useToast();
  const [links, setLinks] = useState<PaymentLinkTemplate[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tx, setTx] = useState<PaymentTransaction[]>([]);
  const [title, setTitle] = useState("Deposit");
  const [amount, setAmount] = useState("200");
  const [mode, setMode] = useState<"fixed" | "customer_chooses">("fixed");
  const [stripeReady, setStripeReady] = useState(false);
  const [stripeAccount, setStripeAccount] = useState<string | null>(null);

  async function load() {
    const [res, connect] = await Promise.all([
      fetch("/api/payments/links"),
      fetch("/api/payments/connect"),
    ]);
    if (!res.ok) {
      push("Could not load payments", "danger");
      return;
    }
    const data = await res.json();
    setLinks(data.paymentLinks || []);
    setInvoices(data.invoices || []);
    setTx(data.transactions || []);
    if (connect.ok) {
      const c = await connect.json();
      setStripeReady(Boolean(c.onboardingComplete));
      setStripeAccount(c.accountId || null);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function startConnect() {
    const res = await fetch("/api/payments/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "onboard" }),
    });
    const data = await res.json();
    if (!res.ok) {
      push(data.error || "Connect failed", "danger");
      return;
    }
    if (data.url) {
      window.location.href = data.url as string;
      return;
    }
    push(data.note || "Stripe Connect ready", "success");
    void load();
  }

  async function createLink(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/payments/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        mode,
        amount: Number(amount),
        minAmount: 25,
        maxAmount: 100,
      }),
    });
    if (!res.ok) {
      push("Could not create link", "danger");
      return;
    }
    push("Payment link created", "success");
    setTitle("Deposit");
    void load();
  }

  return (
    <div className="space-y-10">
      <PageHeader
        title="Payments"
        description="Reusable payment links and invoices. Clients pay processing fees so you receive the listed amount."
      />

      <Card className="max-w-lg p-5">
        <h2 className="mb-2 font-display text-2xl">Stripe Connect</h2>
        <p className="mb-4 text-sm text-muted">
          {stripeReady
            ? `Connected${stripeAccount ? ` (${stripeAccount})` : ""}. No Aura platform fee.`
            : "Connect Stripe to accept card payments. Aura does not take an application fee."}
        </p>
        <Button type="button" tone="neutral" onClick={() => void startConnect()}>
          {stripeReady ? "Manage / refresh Connect" : "Connect Stripe"}
        </Button>
      </Card>

      <Card className="max-w-lg p-5">
        <h2 className="mb-4 font-display text-2xl">New payment link</h2>
        <form onSubmit={createLink} className="space-y-4">
          <Field>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </Field>
          <Field>
            <Label htmlFor="mode">Mode</Label>
            <Select
              id="mode"
              value={mode}
              onChange={(e) =>
                setMode(e.target.value as "fixed" | "customer_chooses")
              }
            >
              <option value="fixed">Fixed amount</option>
              <option value="customer_chooses">Client chooses</option>
            </Select>
          </Field>
          {mode === "fixed" ? (
            <Field>
              <Label htmlFor="amount">Amount you receive ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </Field>
          ) : null}
          <Button type="submit">Create link</Button>
        </form>
      </Card>

      <section>
        <h2 className="mb-3 font-display text-2xl">Payment links</h2>
        <ul className="divide-y divide-line border-y border-line">
          {links.length === 0 ? (
            <li className="py-4 text-sm text-muted">No links yet.</li>
          ) : (
            links.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="font-medium">{l.title}</p>
                  <p className="text-sm text-muted">
                    {l.mode === "fixed"
                      ? `Fixed $${l.amount?.toFixed(2)}`
                      : `Client chooses $${l.minAmount}–$${l.maxAmount}`}
                  </p>
                </div>
                {l.publicUrl ? (
                  <a className="text-sm text-accent" href={l.publicUrl} target="_blank" rel="noreferrer">
                    Open link
                  </a>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 font-display text-2xl">Recent transactions</h2>
        <ul className="divide-y divide-line border-y border-line">
          {tx.length === 0 ? (
            <li className="py-4 text-sm text-muted">No payments yet.</li>
          ) : (
            tx.map((t) => (
              <li key={t.id} className="py-3 text-sm">
                ${t.netAmount.toFixed(2)} net · client paid ${t.grossAmount.toFixed(2)} · fee $
                {t.processingFee.toFixed(2)}
              </li>
            ))
          )}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 font-display text-2xl">Invoices</h2>
        <ul className="divide-y divide-line border-y border-line">
          {invoices.length === 0 ? (
            <li className="py-4 text-sm text-muted">
              Create invoices from a project (API ready). Paid / upcoming / past due tracking supported.
            </li>
          ) : (
            invoices.map((inv) => (
              <li key={inv.id} className="py-3 text-sm">
                {inv.title} · ${inv.netAmount.toFixed(2)} · {inv.status}
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
