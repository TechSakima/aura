"use client";

import { useEffect, useState } from "react";
import {
  Badge,
  ButtonLink,
  Card,
  EmptyState,
  List,
  ListRow,
  useToast,
} from "@/components/ui";

export function SettingsTeam() {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerFirstName, setOwnerFirstName] = useState("");
  const [ownerLastName, setOwnerLastName] = useState("");
  const [studioName, setStudioName] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/studio");
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        push("Could not load team", "danger");
        return;
      }
      const data = await res.json();
      setOwnerEmail(String(data.studio.ownerEmail || ""));
      setOwnerFirstName(String(data.studio.ownerFirstName || ""));
      setOwnerLastName(String(data.studio.ownerLastName || ""));
      setStudioName(String(data.studio.name || ""));
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [push]);

  if (loading) {
    return <EmptyState variant="loading" title="Loading team…" />;
  }

  const displayName = [ownerFirstName, ownerLastName]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" ");
  const label = displayName || ownerEmail || studioName || "Owner";

  return (
    <div className="space-y-4">
      <Card className="min-w-0 p-5">
        <h2 className="font-display text-2xl">Team</h2>
        <p className="mt-1 text-sm text-muted">
          One owner.
        </p>

        <List className="mt-4 border-x-0">
          <ListRow className="gap-x-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">{label}</p>
              {ownerEmail ? (
                <p className="mt-0.5 break-all text-xs text-muted">
                  {ownerEmail}
                </p>
              ) : null}
            </div>
            <Badge tone="accent" className="shrink-0">
              Owner
            </Badge>
          </ListRow>
        </List>

        <div className="mt-4">
          <ButtonLink
            href="/admin/settings/account"
            tone="ghost"
            className="w-full sm:w-auto"
          >
            Account
          </ButtonLink>
        </div>
      </Card>
    </div>
  );
}
