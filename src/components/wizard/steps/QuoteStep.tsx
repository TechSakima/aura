"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Field,
  Input,
  Label,
  Select,
  useConfirm,
  useToast,
} from "@/components/ui";
import type { PackageTemplate, Proposal, Shoot } from "@/lib/types";

function quotePublicUrl(token: string) {
  if (typeof window === "undefined") return `/p/${token}`;
  return `${window.location.origin}/p/${token}`;
}

export function QuoteStep({
  shoot,
  proposal,
  packages,
  onChanged,
}: {
  shoot: Shoot;
  proposal: Proposal | null;
  packages: Pick<PackageTemplate, "id" | "name" | "defaultPricing">[];
  onChanged: () => Promise<unknown>;
}) {
  const { push } = useToast();
  const { confirm } = useConfirm();
  const [packageId, setPackageId] = useState(
    proposal?.packageTemplateId || packages[0]?.id || "",
  );
  const [busy, setBusy] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const publicUrl = useMemo(
    () => (proposal ? quotePublicUrl(proposal.token) : ""),
    [proposal],
  );

  const currentPackageName =
    packages.find((p) => p.id === proposal?.packageTemplateId)?.name ||
    proposal?.title ||
    "Package";

  async function createOrReplaceQuote() {
    if (!packageId) {
      push("Create a package in Prep first", "danger");
      return;
    }
    if (proposal) {
      const ok = await confirm({
        title: "Replace quote?",
        message:
          "The current public link and client selections will be lost.",
        confirmLabel: "Replace",
        tone: "danger",
      });
      if (!ok) return;
    }
    setBusy(true);
    const res = await fetch("/api/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shootId: shoot.id,
        packageTemplateId: packageId,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      push("Could not create quote", "danger");
      return;
    }
    push(proposal ? "Quote replaced" : "Quote created", "success");
    await onChanged();
  }

  async function deleteQuote() {
    if (!proposal) return;
    const ok = await confirm({
      title: "Delete quote?",
      message: "The public link will stop working.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    setBusy(true);
    const res = await fetch(`/api/proposals/${proposal.id}`, {
      method: "DELETE",
    });
    setBusy(false);
    if (!res.ok) {
      push("Could not delete quote", "danger");
      return;
    }
    push("Quote deleted", "success");
    await onChanged();
  }

  async function copyLink() {
    if (!proposal || !publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      push("Link copied — paste it into a text or email", "success");
      if (proposal.status === "draft") {
        await markSent(false);
      }
    } catch {
      push("Could not copy — select the link and copy manually", "danger");
    }
  }

  async function shareLink() {
    if (!proposal || !publicUrl) return;
    if (!navigator.share) {
      await copyLink();
      return;
    }
    try {
      await navigator.share({
        title: proposal.title,
        text: "Here’s your photography quote",
        url: publicUrl,
      });
      if (proposal.status === "draft") {
        await markSent(false);
      }
      push("Shared", "success");
    } catch (err) {
      // User cancelled share sheet — not an error
      if (err instanceof DOMException && err.name === "AbortError") return;
      await copyLink();
    }
  }

  async function markSent(showToast = true) {
    if (!proposal) return;
    setBusy(true);
    const res = await fetch(`/api/proposals/${proposal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "sent" }),
    });
    setBusy(false);
    if (!res.ok) {
      if (showToast) push("Could not update quote", "danger");
      return;
    }
    if (showToast) push("Marked as sent", "success");
    await onChanged();
  }

  async function markAccepted() {
    if (!proposal) return;
    setBusy(true);
    const res = await fetch(`/api/proposals/${proposal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "accepted" }),
    });
    setBusy(false);
    if (!res.ok) {
      push("Could not update quote", "danger");
      return;
    }
    await fetch(`/api/shoots/${shoot.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "booked" }),
    });
    push("Marked accepted / booked", "success");
    await onChanged();
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl">Quote</h2>
        <p className="mt-1 text-sm text-muted">
          Create a quote from a package, then copy the link to share.{" "}
          <Link href="/admin/prep" className="text-accent">
            Manage packages in Prep
          </Link>
        </p>
      </div>

      {proposal ? (
        <div className="space-y-4">
          <div className="rounded-md border border-line p-4 text-sm">
            <p className="font-medium">{proposal.title}</p>
            <p className="text-muted">
              Package: {currentPackageName} · Status: {proposal.status}
            </p>
          </div>

          <Field>
            <Label>Client quote link</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input readOnly value={publicUrl} className="font-mono text-xs" />
              <Button
                type="button"
                tone="neutral"
                disabled={busy}
                onClick={() => void copyLink()}
              >
                Copy link
              </Button>
            </div>
          </Field>

          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} onClick={() => void copyLink()}>
              Copy &amp; mark sent
            </Button>
            {canShare ? (
              <Button
                tone="neutral"
                disabled={busy}
                onClick={() => void shareLink()}
              >
                Share…
              </Button>
            ) : null}
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center rounded-md border border-line px-4 text-sm no-underline"
            >
              Preview
            </a>
            {proposal.status === "draft" ? (
              <Button
                tone="ghost"
                disabled={busy}
                onClick={() => void markSent()}
              >
                Mark sent only
              </Button>
            ) : null}
            {proposal.status !== "accepted" ? (
              <Button
                tone="ghost"
                disabled={busy}
                onClick={() => void markAccepted()}
              >
                Mark accepted
              </Button>
            ) : (
              <p className="self-center text-sm text-muted">
                Quote accepted — continue when ready.
              </p>
            )}
            <Button
              tone="ghost"
              disabled={busy}
              onClick={() => void deleteQuote()}
            >
              Delete quote
            </Button>
          </div>

          <div className="max-w-lg space-y-3 border-t border-line pt-4">
            <p className="text-sm text-muted">
              Change package — creates a new draft quote from the template
              (replaces the current one).
            </p>
            <Field>
              <Label>Package template</Label>
              <Select
                value={packageId}
                onChange={(e) => setPackageId(e.target.value)}
              >
                {packages.length === 0 ? (
                  <option value="">No packages yet</option>
                ) : (
                  packages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))
                )}
              </Select>
            </Field>
            <Button
              tone="neutral"
              disabled={busy || !packageId}
              onClick={() => void createOrReplaceQuote()}
            >
              {busy ? "Working…" : "Replace with this package"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="max-w-lg space-y-4">
          <Field>
            <Label>Package template</Label>
            <Select
              value={packageId}
              onChange={(e) => setPackageId(e.target.value)}
            >
              {packages.length === 0 ? (
                <option value="">No packages yet</option>
              ) : (
                packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))
              )}
            </Select>
          </Field>
          <Button
            disabled={busy || !packageId}
            onClick={() => void createOrReplaceQuote()}
          >
            {busy ? "Creating…" : "Create quote"}
          </Button>
        </div>
      )}
    </div>
  );
}
