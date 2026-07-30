"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { Button, Field, Input, Label, Textarea } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { PublicContactSource } from "@/lib/public-contact";

export type ContactStudioValues = {
  name: string;
  email: string;
  message: string;
  phone?: string;
  /** Honeypot — must stay empty */
  company?: string;
  /** Form mount time (ms) — time-trap (AURA-312) */
  startedAt?: number;
  context?: string;
};

export type ContactStudioProps = {
  studioName?: string;
  source?: PublicContactSource;
  showPhone?: boolean;
  /** Optional context passed through on submit (gallery title, etc.) */
  initialContext?: string;
  submitLabel?: string;
  className?: string;
  onSubmit: (values: ContactStudioValues) => Promise<void>;
  onSuccess?: () => void;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Shared public contact form (AURA-304).
 * Homepage / gallery / booking plug in via `onSubmit` (API = AURA-305).
 */
export function ContactStudio({
  studioName,
  showPhone = true,
  initialContext,
  submitLabel = "Send message",
  className,
  onSubmit,
  onSuccess,
}: ContactStudioProps) {
  const formId = useId();
  const startedAtRef = useRef(Date.now());
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    setError(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedMessage = message.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      setError("Add your name");
      return;
    }
    if (!EMAIL_RE.test(trimmedEmail)) {
      setError("Add a valid email");
      return;
    }
    if (trimmedMessage.length < 2) {
      setError("Add a message");
      return;
    }

    setPending(true);
    try {
      await onSubmit({
        name: trimmedName.slice(0, 120),
        email: trimmedEmail.slice(0, 254),
        message: trimmedMessage.slice(0, 4000),
        phone: trimmedPhone ? trimmedPhone.slice(0, 40) : undefined,
        company: company.trim() || undefined,
        startedAt: startedAtRef.current,
        context: initialContext?.trim() || undefined,
      });
      setSent(true);
      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
      setCompany("");
      onSuccess?.();
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Couldn't send — try again",
      );
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div className={cn("space-y-2 text-left", className)}>
        <p className="text-sm text-ink">Message sent</p>
        <Button
          type="button"
          tone="ghost"
          size="sm"
          className="min-h-11"
          onClick={() => {
            startedAtRef.current = Date.now();
            setSent(false);
            setError(null);
          }}
        >
          Send another
        </Button>
      </div>
    );
  }

  const heading = studioName?.trim()
    ? `Message ${studioName.trim()}`
    : "Message";

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className={cn(
        "relative mx-auto w-full max-w-md space-y-4 text-left",
        className,
      )}
      noValidate
    >
      <p className="text-sm font-medium text-ink">{heading}</p>

      {/* Honeypot — off-screen, not display:none */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0"
      >
        <Label htmlFor={`${formId}-company`}>Company</Label>
        <Input
          id={`${formId}-company`}
          name="company"
          tabIndex={-1}
          autoComplete="off"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </div>

      <Field>
        <Label htmlFor={`${formId}-name`}>Name</Label>
        <Input
          id={`${formId}-name`}
          name="name"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={pending}
        />
      </Field>

      <Field>
        <Label htmlFor={`${formId}-email`}>Email</Label>
        <Input
          id={`${formId}-email`}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={pending}
        />
      </Field>

      {showPhone ? (
        <Field>
          <Label htmlFor={`${formId}-phone`}>Phone</Label>
          <Input
            id={`${formId}-phone`}
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={pending}
          />
        </Field>
      ) : null}

      <Field>
        <Label htmlFor={`${formId}-message`}>Message</Label>
        <Textarea
          id={`${formId}-message`}
          name="message"
          required
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={pending}
        />
      </Field>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <Button
        type="submit"
        className="min-h-11 w-full sm:w-auto"
        pending={pending}
        pendingLabel="Sending…"
        disabled={pending}
      >
        {submitLabel}
      </Button>
    </form>
  );
}
