"use client";

import { FormEvent, useState } from "react";
import { Button, Field, Input, Label, Select, useToast } from "@/components/ui";
import type { Client, Shoot, ShootStatus } from "@/lib/types";

export function IntakeStep({
  client,
  shoot,
  onSaved,
}: {
  client: Client | null;
  shoot: Shoot;
  onSaved: () => Promise<unknown>;
}) {
  const { push } = useToast();
  const [type, setType] = useState(shoot.type);
  const [shootDate, setShootDate] = useState(shoot.shootDate || "");
  const [status, setStatus] = useState<ShootStatus>(shoot.status);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/shoots/${shoot.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        shootDate: shootDate || null,
        status,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      push("Could not save intake", "danger");
      return;
    }
    push("Intake saved", "success");
    await onSaved();
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl">Intake</h2>
        <p className="mt-1 text-sm text-muted">
          Confirm the shoot type and date for {client?.name || "this client"}.
        </p>
      </div>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">Client</dt>
          <dd className="font-medium">{client?.name}</dd>
        </div>
        <div>
          <dt className="text-muted">Email</dt>
          <dd>{client?.email}</dd>
        </div>
      </dl>
      <form onSubmit={onSubmit} className="max-w-lg space-y-4">
        <Field>
          <Label>Shoot type</Label>
          <Input value={type} onChange={(e) => setType(e.target.value)} required list="shoot-types" />
          <datalist id="shoot-types">
            <option value="Weddings" />
            <option value="Maternity" />
            <option value="Mini-Sessions" />
            <option value="Family" />
            <option value="Portraits" />
          </datalist>
        </Field>
        <Field>
          <Label>Shoot date</Label>
          <Input
            type="date"
            value={shootDate}
            onChange={(e) => setShootDate(e.target.value)}
          />
        </Field>
        <Field>
          <Label>Status</Label>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as ShootStatus)}
          >
            {["inquiry", "proposed", "booked", "delivered", "archived"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save intake"}
        </Button>
      </form>
    </div>
  );
}
