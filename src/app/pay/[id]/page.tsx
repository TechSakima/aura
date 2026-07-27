"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button, Field, Input, Label } from "@/components/ui";

export default function PublicPayPage() {
  const params = useParams<{ id: string }>();
  const [link, setLink] = useState<{
    title: string;
    description?: string;
    mode: string;
    amount?: number;
    minAmount?: number;
    maxAmount?: number;
    feePreview?: { grossAmount: number; processingFee: number; netAmount: number };
  } | null>(null);
  const [amount, setAmount] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/public/pay/${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else {
          setLink(d.paymentLink);
          if (d.feePreview) setLink((l) => (l ? { ...l, feePreview: d.feePreview } : l));
          if (d.paymentLink?.amount) setAmount(String(d.paymentLink.amount));
        }
      })
      .catch(() => setError("Could not load payment link"));
  }, [params.id]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/public/pay/${params.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(amount),
        email,
        name,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Payment failed");
      return;
    }
    setDone(true);
  }

  if (error && !link) {
    return <p className="shell-pad py-16 text-center text-muted">{error}</p>;
  }
  if (!link) {
    return <p className="shell-pad py-16 text-center text-muted">Loading…</p>;
  }
  if (done) {
    return (
      <div className="shell-pad mx-auto max-w-md py-20 text-center">
        <h1 className="font-display text-3xl">Thank you</h1>
        <p className="mt-2 text-muted">Payment recorded.</p>
      </div>
    );
  }

  const previewNet = Number(amount) || link.amount || 0;

  return (
    <div className="shell-pad mx-auto max-w-md py-16">
      <h1 className="font-display text-4xl">{link.title}</h1>
      {link.description ? (
        <p className="mt-2 text-muted">{link.description}</p>
      ) : null}
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <Field>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
          />
        </Field>
        <Field>
          <Label htmlFor="amount">Amount (studio receives)</Label>
          <Input
            id="amount"
            type="number"
            min={link.minAmount || 1}
            max={link.maxAmount}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={link.mode === "fixed"}
            required
          />
        </Field>
        <p className="text-sm text-muted">
          A card processing fee is added at checkout so the studio receives $
          {previewNet.toFixed(2)}.
        </p>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button type="submit" className="w-full">
          Pay now
        </Button>
      </form>
    </div>
  );
}
