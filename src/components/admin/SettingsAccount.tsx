"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, updatePassword } from "firebase/auth";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Label,
  List,
  ListRow,
  useToast,
} from "@/components/ui";
import { firebaseConfigured, getFirebaseAuth } from "@/lib/firebase/client";
import { useUnsavedChangesGuard } from "@/lib/hooks/use-unsaved-changes";

type SessionRow = {
  expiresAt: string;
  current: boolean;
};

function formatExpiry(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function SettingsAccount() {
  const { push } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerFirstName, setOwnerFirstName] = useState("");
  const [ownerLastName, setOwnerLastName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revokeBusy, setRevokeBusy] = useState(false);
  useUnsavedChangesGuard(dirty);

  async function loadSessions() {
    setSessionsLoading(true);
    const res = await fetch("/api/auth/sessions");
    setSessionsLoading(false);
    if (!res.ok) {
      setSessions([]);
      return;
    }
    const data = await res.json();
    setSessions(data.sessions || []);
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/studio");
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        push("Could not load account", "danger");
        return;
      }
      const data = await res.json();
      setOwnerEmail(data.studio.ownerEmail || "");
      setOwnerFirstName(data.studio.ownerFirstName || "");
      setOwnerLastName(data.studio.ownerLastName || "");
      setDirty(false);
    }
    void load();
    void loadSessions();
    return () => {
      cancelled = true;
    };
  }, [push]);

  async function saveAccount(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/studio", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: "account",
        ownerFirstName: ownerFirstName.trim(),
        ownerLastName: ownerLastName.trim(),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      push("Save failed", "danger");
      return;
    }
    setDirty(false);
    push("Account saved", "success");
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    if (!ownerEmail) {
      push("Owner email missing", "danger");
      return;
    }
    if (newPassword.length < 8) {
      push("Use at least 8 characters", "danger");
      return;
    }
    if (newPassword !== confirmPassword) {
      push("New passwords do not match", "danger");
      return;
    }
    if (!firebaseConfigured()) {
      push("Sign-in is not configured", "danger");
      return;
    }
    const auth = getFirebaseAuth();
    if (!auth) {
      push("Sign-in is unavailable", "danger");
      return;
    }

    setPasswordBusy(true);
    try {
      const cred = await signInWithEmailAndPassword(
        auth,
        ownerEmail,
        currentPassword,
      );
      await updatePassword(cred.user, newPassword);
      await fetch("/api/auth/sessions", { method: "DELETE" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      push("Password updated", "success");
      await loadSessions();
    } catch {
      push("Could not update password", "danger");
    } finally {
      setPasswordBusy(false);
    }
  }

  async function revokeOthers() {
    setRevokeBusy(true);
    const res = await fetch("/api/auth/sessions", { method: "DELETE" });
    setRevokeBusy(false);
    if (!res.ok) {
      push("Could not sign out other devices", "danger");
      return;
    }
    push("Other devices signed out", "success");
    await loadSessions();
  }

  if (loading) {
    return <EmptyState variant="loading" title="Loading account…" />;
  }

  const otherCount = sessions.filter((s) => !s.current).length;

  return (
    <div className="min-w-0 space-y-8">
      <Card className="min-w-0 space-y-6 p-5">
        <div>
          <h2 className="font-display text-2xl">Account</h2>
          <p className="mt-1 text-sm text-muted">
            Studio emails go to the owner address.
          </p>
        </div>

        <form onSubmit={saveAccount} className="space-y-4">
          <Field hint="Sign-in email. Can’t change here.">
            <Label htmlFor="owner-email">Owner email</Label>
            <Input
              id="owner-email"
              type="email"
              value={ownerEmail}
              disabled
              autoComplete="email"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <Label htmlFor="owner-first">First name</Label>
              <Input
                id="owner-first"
                value={ownerFirstName}
                autoComplete="given-name"
                onChange={(e) => {
                  setOwnerFirstName(e.target.value);
                  setDirty(true);
                }}
              />
            </Field>
            <Field>
              <Label htmlFor="owner-last">Last name</Label>
              <Input
                id="owner-last"
                value={ownerLastName}
                autoComplete="family-name"
                onChange={(e) => {
                  setOwnerLastName(e.target.value);
                  setDirty(true);
                }}
              />
            </Field>
          </div>

          <Button
            type="submit"
            pending={saving}
            pendingLabel="Saving…"
            className="w-full sm:w-auto"
          >
            Save account
          </Button>
        </form>
      </Card>

      <Card className="min-w-0 space-y-4 p-5">
        <div>
          <h2 className="font-display text-2xl">Password</h2>
          <p className="mt-1 text-sm text-muted">
            Change the password for {ownerEmail || "this account"}.
          </p>
        </div>
        <form onSubmit={changePassword} className="space-y-4">
          <Field>
            <Label htmlFor="current-password">Current password</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </Field>
          <Field>
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
            />
          </Field>
          <Field>
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
            />
          </Field>
          <Button
            type="submit"
            pending={passwordBusy}
            pendingLabel="Updating…"
            className="w-full sm:w-auto"
          >
            Update password
          </Button>
        </form>
      </Card>

      <Card className="min-w-0 space-y-4 p-5">
        <div>
          <h2 className="font-display text-2xl">Signed-in devices</h2>
          <p className="mt-1 text-sm text-muted">
            Active studio sign-ins for this owner.
          </p>
        </div>
        {sessionsLoading ? (
          <EmptyState variant="loading" title="Loading devices…" />
        ) : sessions.length === 0 ? (
          <EmptyState variant="inline" title="No active sign-ins listed." />
        ) : (
          <List className="border-x-0">
            {sessions.map((session, index) => (
              <ListRow key={`${session.expiresAt}-${index}`}>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">
                    {session.current ? "This device" : "Other device"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    Expires {formatExpiry(session.expiresAt)}
                  </p>
                </div>
                {session.current ? (
                  <Badge tone="accent" className="shrink-0">
                    Current
                  </Badge>
                ) : null}
              </ListRow>
            ))}
          </List>
        )}
        {otherCount > 0 ? (
          <Button
            type="button"
            tone="neutral"
            pending={revokeBusy}
            pendingLabel="Signing out…"
            className="w-full sm:w-auto"
            onClick={() => void revokeOthers()}
          >
            Sign out other devices
          </Button>
        ) : null}
      </Card>

      <div>
        <Button
          type="button"
          tone="ghost"
          className="w-full sm:w-auto"
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            router.push("/admin/login");
          }}
        >
          Log out
        </Button>
      </div>
    </div>
  );
}
