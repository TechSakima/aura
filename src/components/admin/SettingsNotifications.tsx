"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Button,
  ButtonLink,
  Card,
  EmptyState,
  Field,
  Input,
  Label,
  Switch,
  useToast,
} from "@/components/ui";
import {
  DEFAULT_CONTACT_AUTO_REPLY,
  normalizeContactPrefs,
} from "@/lib/contact-prefs";
import { useUnsavedChangesGuard } from "@/lib/hooks/use-unsaved-changes";

type PrefKey =
  | "emailQuoteAccepted"
  | "emailPaymentReceived"
  | "emailBookingSubmitted"
  | "emailContactMessage"
  | "emailClientQuote"
  | "emailClientGallery"
  | "emailClientPayment"
  | "emailClientBooking";

type Prefs = Record<PrefKey, boolean>;

const STUDIO_TOGGLES: { key: PrefKey; label: string }[] = [
  { key: "emailQuoteAccepted", label: "Quote accepted" },
  { key: "emailPaymentReceived", label: "Payment received" },
  { key: "emailBookingSubmitted", label: "Booking request" },
  { key: "emailContactMessage", label: "Contact message" },
];

const CLIENT_TOGGLES: { key: PrefKey; label: string }[] = [
  { key: "emailClientQuote", label: "Quote shared" },
  { key: "emailClientGallery", label: "Gallery live" },
  { key: "emailClientPayment", label: "Payment receipt" },
  { key: "emailClientBooking", label: "Booking confirmation" },
];

const DEFAULT_PREFS: Prefs = {
  emailQuoteAccepted: true,
  emailPaymentReceived: true,
  emailBookingSubmitted: true,
  emailContactMessage: true,
  emailClientQuote: true,
  emailClientGallery: true,
  emailClientPayment: true,
  emailClientBooking: true,
};

function PrefRow({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <Label htmlFor={id} className="min-w-0 flex-1 font-normal">
        {label}
      </Label>
      <Switch
        id={id}
        label={label}
        checked={checked}
        onCheckedChange={onChange}
      />
    </div>
  );
}

export function SettingsNotifications() {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [contactDirty, setContactDirty] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [ownerEmail, setOwnerEmail] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [showContactForm, setShowContactForm] = useState(false);
  const [showGalleryContactForm, setShowGalleryContactForm] = useState(false);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [autoReplyMessage, setAutoReplyMessage] = useState(
    DEFAULT_CONTACT_AUTO_REPLY,
  );
  useUnsavedChangesGuard(dirty || contactDirty);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/studio");
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        push("Could not load notifications", "danger");
        return;
      }
      const data = await res.json();
      const n = data.studio.notificationPrefs || {};
      setPrefs({
        emailQuoteAccepted: n.emailQuoteAccepted !== false,
        emailPaymentReceived: n.emailPaymentReceived !== false,
        emailBookingSubmitted: n.emailBookingSubmitted !== false,
        emailContactMessage: n.emailContactMessage !== false,
        emailClientQuote: n.emailClientQuote !== false,
        emailClientGallery: n.emailClientGallery !== false,
        emailClientPayment: n.emailClientPayment !== false,
        emailClientBooking: n.emailClientBooking !== false,
      });
      const owner = String(data.studio.ownerEmail || "");
      setOwnerEmail(owner);
      const contact = normalizeContactPrefs(data.studio.contactPrefs);
      setRecipientEmail(contact.recipientEmail || "");
      setShowGalleryContactForm(contact.showGalleryContactForm);
      setAutoReplyEnabled(contact.autoReplyEnabled);
      setAutoReplyMessage(
        contact.autoReplyMessage || DEFAULT_CONTACT_AUTO_REPLY,
      );
      setShowContactForm(Boolean(data.studio.homepage?.showContactForm));
      setDirty(false);
      setContactDirty(false);
      if (
        typeof window !== "undefined" &&
        window.location.hash === "#contact"
      ) {
        requestAnimationFrame(() => {
          document.getElementById("contact")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [push]);

  function setPref(key: PrefKey, next: boolean) {
    setPrefs((p) => ({ ...p, [key]: next }));
    setDirty(true);
  }

  async function save(e?: FormEvent) {
    e?.preventDefault();
    setSaving(true);
    const res = await fetch("/api/studio", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: "notifications",
        notificationPrefs: prefs,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      push("Save failed", "danger");
      return;
    }
    setDirty(false);
    push("Notifications saved", "success");
  }

  async function saveContact(e?: FormEvent) {
    e?.preventDefault();
    const trimmed = recipientEmail.trim();
    if (trimmed) {
      const normalized = normalizeContactPrefs({
        recipientEmail: trimmed,
        showGalleryContactForm,
        autoReplyEnabled,
        autoReplyMessage,
      });
      if (!normalized.recipientEmail) {
        push("Enter a valid recipient email", "danger");
        return;
      }
    }
    setSavingContact(true);
    const contactPrefs = normalizeContactPrefs({
      recipientEmail: trimmed || undefined,
      showGalleryContactForm,
      autoReplyEnabled,
      autoReplyMessage,
    });
    const res = await fetch("/api/studio", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: "contact",
        contactPrefs: {
          ...contactPrefs,
          recipientEmail: trimmed ? contactPrefs.recipientEmail : null,
        },
        homepage: { showContactForm },
      }),
    });
    setSavingContact(false);
    if (!res.ok) {
      push("Save failed", "danger");
      return;
    }
    setRecipientEmail(contactPrefs.recipientEmail || "");
    setAutoReplyMessage(
      contactPrefs.autoReplyMessage || DEFAULT_CONTACT_AUTO_REPLY,
    );
    setContactDirty(false);
    push("Contact prefs saved", "success");
  }

  if (loading) {
    return <EmptyState variant="loading" title="Loading notifications…" />;
  }

  return (
    <div className="space-y-4">
      <Card className="min-w-0 p-5">
        <h2 className="font-display text-2xl">Notifications</h2>
        <p className="mt-1 text-sm text-muted">
          Studio alerts go to the owner email in Account.
        </p>

        <form onSubmit={save} className="mt-6 space-y-8">
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-ink">
              Email me when…
            </legend>
            {STUDIO_TOGGLES.map(({ key, label }) => (
              <PrefRow
                key={key}
                id={`pref-${key}`}
                label={label}
                checked={prefs[key]}
                onChange={(next) => setPref(key, next)}
              />
            ))}
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-ink">
              Email contacts when…
            </legend>
            {CLIENT_TOGGLES.map(({ key, label }) => (
              <PrefRow
                key={key}
                id={`pref-${key}`}
                label={label}
                checked={prefs[key]}
                onChange={(next) => setPref(key, next)}
              />
            ))}
          </fieldset>

          <Button
            type="submit"
            pending={saving}
            pendingLabel="Saving…"
            className="w-full sm:w-auto"
          >
            Save notifications
          </Button>
        </form>
      </Card>

      <Card id="contact" className="min-w-0 scroll-mt-24 p-5">
        <h2 className="font-display text-2xl">Contact</h2>
        <p className="mt-1 text-sm text-muted">
          Where public contact messages go, and where the form appears.
        </p>

        <form onSubmit={saveContact} className="mt-6 space-y-6">
          <Field>
            <Label htmlFor="contact-recipient">Deliver to</Label>
            <Input
              id="contact-recipient"
              type="email"
              autoComplete="email"
              value={recipientEmail}
              onChange={(e) => {
                setRecipientEmail(e.target.value);
                setContactDirty(true);
              }}
              placeholder={ownerEmail || "Owner email"}
            />
          </Field>

          <div className="flex min-h-11 items-center justify-between gap-3">
            <div className="min-w-0">
              <Label htmlFor="contact-website">Website form</Label>
            </div>
            <Switch
              id="contact-website"
              label="Website form"
              checked={showContactForm}
              onCheckedChange={(next) => {
                setShowContactForm(next);
                setContactDirty(true);
              }}
            />
          </div>

          <div className="flex min-h-11 items-center justify-between gap-3">
            <div className="min-w-0">
              <Label htmlFor="contact-gallery">Gallery form</Label>
            </div>
            <Switch
              id="contact-gallery"
              label="Gallery form"
              checked={showGalleryContactForm}
              onCheckedChange={(next) => {
                setShowGalleryContactForm(next);
                setContactDirty(true);
              }}
            />
          </div>

          <div className="flex min-h-11 items-center justify-between gap-3">
            <div className="min-w-0">
              <Label htmlFor="contact-auto-reply">Auto-reply</Label>
            </div>
            <Switch
              id="contact-auto-reply"
              label="Auto-reply"
              checked={autoReplyEnabled}
              onCheckedChange={(next) => {
                setAutoReplyEnabled(next);
                setContactDirty(true);
              }}
            />
          </div>

          {autoReplyEnabled ? (
            <Field>
              <Label htmlFor="contact-auto-reply-message">
                Auto-reply message
              </Label>
              <Input
                id="contact-auto-reply-message"
                value={autoReplyMessage}
                onChange={(e) => {
                  setAutoReplyMessage(e.target.value);
                  setContactDirty(true);
                }}
              />
            </Field>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              type="submit"
              pending={savingContact}
              pendingLabel="Saving…"
              className="w-full sm:w-auto"
            >
              Save contact
            </Button>
            <ButtonLink
              href="/admin/settings/website#contact"
              tone="ghost"
              className="w-full sm:w-auto"
            >
              Website contact
            </ButtonLink>
          </div>
        </form>
      </Card>
    </div>
  );
}
