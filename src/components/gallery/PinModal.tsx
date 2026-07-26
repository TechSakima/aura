"use client";

import { FormEvent, useState } from "react";
import { Button, Dialog, Field, Input, Label } from "@/components/ui";

export function PinModal({
  open,
  onClose,
  onSubmit,
  title = "Enter download PIN",
  description = "Enter the 4-digit PIN your photographer shared with you.",
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (pin: string) => void | Promise<void>;
  title?: string;
  description?: string;
}) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (pin.length !== 4) return;
    setBusy(true);
    try {
      await onSubmit(pin);
      setPin("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <p className="mb-4 text-sm text-muted">{description}</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field>
          <Label htmlFor="pin">4-digit PIN</Label>
          <Input
            id="pin"
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="••••"
            autoComplete="one-time-code"
            required
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" tone="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pin.length !== 4 || busy}>
            Confirm
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
