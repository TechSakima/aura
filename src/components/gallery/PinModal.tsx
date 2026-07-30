"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button, Dialog, Field, Input, Label } from "@/components/ui";

export function PinModal({
  open,
  onClose,
  onSubmit,
  title = "Enter download PIN",
  description = "Enter the 4-digit PIN your photographer shared with you.",
  footnote,
  confirmLabel = "Download",
  error,
  onClearError,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (pin: string) => void | Promise<void>;
  title?: string;
  description?: string;
  /** Extra line under the field (e.g. originals note). */
  footnote?: string;
  confirmLabel?: string;
  error?: string | null;
  onClearError?: () => void;
}) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setPin("");
      setLocalError(null);
      setBusy(false);
    }
  }, [open]);

  const fieldError = error || localError;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (pin.length !== 4) return;
    setBusy(true);
    setLocalError(null);
    onClearError?.();
    try {
      await onSubmit(pin);
      setPin("");
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "Could not download",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <p className="mb-4 text-sm text-muted">{description}</p>
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <Field error={fieldError || undefined}>
          <Label htmlFor="pin">4-digit PIN</Label>
          <Input
            id="pin"
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, "").slice(0, 4));
              setLocalError(null);
              onClearError?.();
            }}
            placeholder="••••"
            autoComplete="one-time-code"
            required
            aria-invalid={Boolean(fieldError)}
          />
        </Field>
        {footnote ? (
          <p className="text-xs text-muted">{footnote}</p>
        ) : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            tone="ghost"
            className="min-h-11 w-full sm:w-auto"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="min-h-11 w-full sm:w-auto"
            disabled={pin.length !== 4 || busy}
            pending={busy}
            pendingLabel="Working…"
          >
            {confirmLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
