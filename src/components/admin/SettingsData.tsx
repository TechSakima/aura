"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  ButtonLink,
  Card,
  Field,
  Input,
  Label,
  useConfirm,
  useToast,
} from "@/components/ui";

export function SettingsData() {
  const { push } = useToast();
  const { confirm } = useConfirm();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [dangerBusy, setDangerBusy] = useState<string | null>(null);
  const [studioName, setStudioName] = useState("");
  const [homepageEnabled, setHomepageEnabled] = useState(false);
  const [gcalConnected, setGcalConnected] = useState(false);
  const [stripeReady, setStripeReady] = useState(false);
  const [confirmName, setConfirmName] = useState("");

  async function load() {
    const [studioRes, connectRes] = await Promise.all([
      fetch("/api/studio"),
      fetch("/api/payments/connect"),
    ]);
    if (studioRes.ok) {
      const data = await studioRes.json();
      setStudioName(String(data.studio?.name || ""));
      setHomepageEnabled(Boolean(data.studio?.homepage?.enabled));
      setGcalConnected(Boolean(data.studio?.googleCalendarConnected));
    }
    if (connectRes.ok) {
      const c = await connectRes.json().catch(() => ({}));
      setStripeReady(Boolean(c.onboardingComplete || c.accountId));
    }
  }

  useEffect(() => {
    void load();
    if (typeof window !== "undefined" && window.location.hash === "#danger") {
      requestAnimationFrame(() => {
        document.getElementById("danger")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }
  }, []);

  async function downloadExport() {
    setBusy(true);
    try {
      const res = await fetch("/api/studio/export");
      if (!res.ok) {
        push("Could not export", "danger");
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = /filename="([^"]+)"/.exec(disposition);
      const filename = match?.[1] || "aura-studio-export.json";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      push("Export downloaded", "success");
    } catch {
      push("Could not export", "danger");
    } finally {
      setBusy(false);
    }
  }

  async function disconnectCalendar() {
    const ok = await confirm({
      title: "Disconnect Google Calendar?",
      message: "New sessions stop syncing to the calendar.",
      confirmLabel: "Disconnect",
      tone: "danger",
    });
    if (!ok) return;
    setDangerBusy("gcal");
    const res = await fetch("/api/integrations/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "disconnect" }),
    });
    setDangerBusy(null);
    if (!res.ok) {
      push("Could not disconnect", "danger");
      return;
    }
    setGcalConnected(false);
    push("Calendar disconnected", "success");
  }

  async function disconnectPayments() {
    const ok = await confirm({
      title: "Disconnect payments?",
      message: "Pay links stop accepting cards until you connect again.",
      confirmLabel: "Disconnect",
      tone: "danger",
    });
    if (!ok) return;
    setDangerBusy("stripe");
    const res = await fetch("/api/payments/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "disconnect" }),
    });
    setDangerBusy(null);
    if (!res.ok) {
      push("Could not disconnect", "danger");
      return;
    }
    setStripeReady(false);
    push("Payments disconnected", "success");
  }

  async function disableHomepage() {
    const ok = await confirm({
      title: "Turn off website?",
      message: "Your public site URL stops serving until you enable it again.",
      confirmLabel: "Turn off",
      tone: "danger",
    });
    if (!ok) return;
    setDangerBusy("homepage");
    const res = await fetch("/api/studio", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: "data",
        homepage: { enabled: false },
      }),
    });
    setDangerBusy(null);
    if (!res.ok) {
      push("Could not update website", "danger");
      return;
    }
    setHomepageEnabled(false);
    push("Website turned off", "success");
  }

  async function deleteStudio() {
    if (!studioName || confirmName.trim() !== studioName) {
      push("Type the studio name to confirm", "danger");
      return;
    }
    const ok = await confirm({
      title: "Delete studio permanently?",
      message:
        "Projects, galleries, and templates are removed. Photo files are deleted. This cannot be undone.",
      confirmLabel: "Delete studio",
      tone: "danger",
    });
    if (!ok) return;
    setDangerBusy("delete");
    const res = await fetch("/api/studio", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmName: confirmName.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setDangerBusy(null);
    if (!res.ok) {
      push(String(data.error || "Could not delete studio"), "danger");
      return;
    }
    router.push("/admin/login");
  }

  return (
    <div className="space-y-4">
      <Card className="min-w-0 p-5">
        <h2 className="font-display text-2xl">Data</h2>
        <p className="mt-1 text-sm text-muted">
          JSON export — profile and projects, no photo files.
        </p>

        <div className="mt-6">
          <Button
            type="button"
            className="min-h-11 w-full sm:w-auto"
            pending={busy}
            pendingLabel="Exporting…"
            onClick={() => void downloadExport()}
          >
            Download export
          </Button>
        </div>
      </Card>

      <Card id="danger" className="min-w-0 scroll-mt-24 border-danger/40 p-5">
        <h2 className="font-display text-2xl">Danger zone</h2>
        <p className="mt-1 text-sm text-muted">
          Irreversible or disruptive actions. Export first if you need a copy.
        </p>

        <div className="mt-6 space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">Google Calendar</p>
              <p className="text-xs text-muted">
                {gcalConnected ? "Connected" : "Not connected"}
              </p>
            </div>
            <Button
              type="button"
              tone="danger"
              className="min-h-11 w-full sm:w-auto"
              disabled={!gcalConnected || dangerBusy !== null}
              pending={dangerBusy === "gcal"}
              pendingLabel="Disconnecting…"
              onClick={() => void disconnectCalendar()}
            >
              Disconnect calendar
            </Button>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">Card payments</p>
              <p className="text-xs text-muted">
                {stripeReady ? "Connected" : "Not connected"}
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button
                type="button"
                tone="danger"
                className="min-h-11 w-full sm:w-auto"
                disabled={!stripeReady || dangerBusy !== null}
                pending={dangerBusy === "stripe"}
                pendingLabel="Disconnecting…"
                onClick={() => void disconnectPayments()}
              >
                Disconnect payments
              </Button>
              <ButtonLink
                href="/admin/settings/payments"
                tone="ghost"
                className="min-h-11 w-full sm:w-auto"
              >
                Payment settings
              </ButtonLink>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">Public website</p>
              <p className="text-xs text-muted">
                {homepageEnabled ? "Live" : "Off"}
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button
                type="button"
                tone="danger"
                className="min-h-11 w-full sm:w-auto"
                disabled={!homepageEnabled || dangerBusy !== null}
                pending={dangerBusy === "homepage"}
                pendingLabel="Updating…"
                onClick={() => void disableHomepage()}
              >
                Turn off website
              </Button>
              <ButtonLink
                href="/admin/settings/website"
                tone="ghost"
                className="min-h-11 w-full sm:w-auto"
              >
                Website settings
              </ButtonLink>
            </div>
          </div>

          <div className="space-y-3 border-t border-line pt-6">
            <div>
              <p className="text-sm font-medium text-ink">Delete studio</p>
              <p className="mt-1 text-xs text-muted">
                Removes projects, galleries, templates, and photo files.
              </p>
            </div>
            <Field>
              <Label htmlFor="danger-confirm-name">
                Type {studioName || "studio name"} to confirm
              </Label>
              <Input
                id="danger-confirm-name"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                autoComplete="off"
              />
            </Field>
            <Button
              type="button"
              tone="danger"
              className="min-h-11 w-full sm:w-auto"
              disabled={
                !studioName ||
                confirmName.trim() !== studioName ||
                dangerBusy !== null
              }
              pending={dangerBusy === "delete"}
              pendingLabel="Deleting…"
              onClick={() => void deleteStudio()}
            >
              Delete studio
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
