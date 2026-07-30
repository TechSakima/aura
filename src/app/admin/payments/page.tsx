"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Button,
  ButtonLink,
  Card,
  Cluster,
  Dialog,
  EmptyState,
  Field,
  Input,
  Label,
  PageHeader,
  Panel,
  Select,
  Stack,
  StatusBadge,
  useConfirm,
  useToast,
} from "@/components/ui";


import type {
  Invoice,
  PaymentLinkTemplate,
  PaymentTransaction,
  Project,
} from "@/lib/types";

type EditDraft = {
  id: string;
  title: string;
  mode: "fixed" | "customer_chooses";
  amount: string;
  active: boolean;
  projectId: string;
};

export default function PaymentsPage() {
  const { push } = useToast();
  const { confirm } = useConfirm();
  const router = useRouter();
  const [links, setLinks] = useState<PaymentLinkTemplate[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tx, setTx] = useState<PaymentTransaction[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("Deposit");
  const [amount, setAmount] = useState("200");
  const [mode, setMode] = useState<"fixed" | "customer_chooses">("fixed");
  const [projectId, setProjectId] = useState("");
  const [stripeConfigured, setStripeConfigured] = useState(true);
  const [stripeReady, setStripeReady] = useState(false);
  const [emailTarget, setEmailTarget] = useState<PaymentLinkTemplate | null>(
    null,
  );
  const [emailTo, setEmailTo] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [editBusy, setEditBusy] = useState(false);

  async function load() {
    const [res, connect, projs, studioRes] = await Promise.all([
      fetch("/api/payments/links"),
      fetch("/api/payments/connect"),
      fetch("/api/projects"),
      fetch("/api/studio"),
    ]);
    setLoading(false);
    if (!res.ok) {
      push("Could not load payments", "danger");
      return;
    }
    const data = await res.json();
    setLinks(data.paymentLinks || []);
    setInvoices(data.invoices || []);
    setTx(data.transactions || []);
    if (connect.ok) {
      const c = await connect.json().catch(() => ({}));
      setStripeConfigured(c.stripeConfigured !== false);
      setStripeReady(Boolean(c.onboardingComplete));
    }
    if (projs.ok) {
      const p = await projs.json();
      setProjects(p.projects || []);
    }
    if (studioRes.ok) {
      const s = await studioRes.json().catch(() => ({}));
      const d = s.studio?.paymentDefaults as
        | { defaultDepositAmount?: number; defaultLinkTitle?: string }
        | undefined;
      if (d?.defaultLinkTitle) setTitle(d.defaultLinkTitle);
      if (
        d?.defaultDepositAmount != null &&
        Number.isFinite(d.defaultDepositAmount) &&
        d.defaultDepositAmount > 0
      ) {
        setAmount(String(d.defaultDepositAmount));
      }
    }
  }

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const connect = q.get("connect");
    if (connect === "return" || connect === "refresh") {
      router.replace(`/admin/settings/payments?connect=${connect}`);
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, []);

  async function createLink(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/payments/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        mode,
        amount: Number(amount),
        minAmount: 25,
        maxAmount: 500,
        projectId: projectId || undefined,
      }),
    });
    if (!res.ok) {
      push("Could not create link", "danger");
      return;
    }
    push("Payment link created", "success");
    setProjectId("");
    void load();
  }

  async function copyLink(link: PaymentLinkTemplate) {
    const url = link.publicUrl || `${window.location.origin}/pay/${link.id}`;
    try {
      await navigator.clipboard.writeText(url);
      push("Link copied", "success");
    } catch {
      push("Could not copy", "danger");
    }
  }

  function openEmail(link: PaymentLinkTemplate) {
    const project = link.projectId
      ? projects.find((p) => p.id === link.projectId)
      : undefined;
    setEmailTo(project?.email || "");
    setEmailTarget(link);
  }

  async function sendEmail(e: FormEvent) {
    e.preventDefault();
    if (!emailTarget) return;
    setEmailBusy(true);
    const res = await fetch("/api/payments/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "email",
        id: emailTarget.id,
        email: emailTo.trim(),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setEmailBusy(false);
    if (!res.ok) {
      push(String(data.error || "Could not send"), "danger");
      return;
    }
    if (data.emailed === false) {
      push("Email skipped", "danger");
      return;
    }
    push("Email sent", "success");
    setEmailTarget(null);
  }

  function openEdit(link: PaymentLinkTemplate) {
    setEditDraft({
      id: link.id,
      title: link.title,
      mode: link.mode,
      amount: String(link.amount ?? ""),
      active: link.active !== false,
      projectId: link.projectId || "",
    });
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editDraft) return;
    setEditBusy(true);
    const res = await fetch("/api/payments/links", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editDraft.id,
        title: editDraft.title,
        mode: editDraft.mode,
        amount:
          editDraft.mode === "fixed" ? Number(editDraft.amount) : undefined,
        active: editDraft.active,
        projectId: editDraft.projectId || null,
      }),
    });
    setEditBusy(false);
    if (!res.ok) {
      push("Could not update link", "danger");
      return;
    }
    push("Link updated", "success");
    setEditDraft(null);
    void load();
  }

  async function archiveLink(link: PaymentLinkTemplate) {
    const ok = await confirm({
      title: "Archive payment link?",
      message: `Archive “${link.title}”? It will no longer appear in your templates.`,
      confirmLabel: "Archive",
      tone: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/payments/links?id=${encodeURIComponent(link.id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      push("Could not archive", "danger");
      return;
    }
    push("Archived", "success");
    void load();
  }

  function amountLabel(link: PaymentLinkTemplate) {
    if (link.mode === "fixed") {
      return `Fixed $${(link.amount ?? 0).toFixed(2)}`;
    }
    return `Open $${link.minAmount ?? 0}–$${link.maxAmount ?? 0}`;
  }

  function projectName(id?: string) {
    if (!id) return null;
    return projects.find((p) => p.id === id)?.name || null;
  }

  return (
    <div className="space-y-10">
      <PageHeader
        title="Payments"
        description="Reusable payment links and project deposits."
      />

      <Stack gap="gap-8">
        <div className="flex max-w-lg flex-col gap-3 border-y border-line py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            {!stripeConfigured
              ? "Payments aren’t available yet."
              : stripeReady
                ? "Card payments on"
                : "Set up card payments in Settings."}
          </p>
          {stripeConfigured ? (
            <ButtonLink
              href={
                stripeReady
                  ? "/admin/settings/payments#defaults"
                  : "/admin/settings/payments"
              }
              tone={stripeReady ? "ghost" : "neutral"}
              className="min-h-11 shrink-0"
            >
              {stripeReady ? "Payment settings" : "Set up payments"}
            </ButtonLink>
          ) : null}
        </div>

        <Card className="w-full max-w-lg p-5">
          <h2 className="mb-4 font-display text-2xl">New payment link</h2>
          <form onSubmit={createLink} className="space-y-4">
            <Field>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </Field>
            <Field>
              <Label htmlFor="mode">Mode</Label>
              <Select
                id="mode"
                value={mode}
                onChange={(e) =>
                  setMode(e.target.value as "fixed" | "customer_chooses")
                }
              >
                <option value="fixed">Fixed amount</option>
                <option value="customer_chooses">Open amount</option>
              </Select>
            </Field>
            {mode === "fixed" ? (
              <Field>
                <Label htmlFor="amount">Amount you receive ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </Field>
            ) : null}
            <Field>
              <Label htmlFor="project">Project (optional)</Label>
              <Select
                id="project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                <option value="">None</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Button type="submit">Create link</Button>
          </form>
        </Card>
      </Stack>

      <section className="space-y-4">
        <h2 className="font-display text-2xl">Payment links</h2>
        {loading ? (
          <EmptyState variant="loading" title="Loading payments…" />
        ) : links.length === 0 ? (
          <EmptyState
            variant="inline"
            title="No links yet."
            className="border-y border-line py-4"
          />
        ) : (
          <ul className="space-y-4">
            {links.map((l) => {
              const linked = projectName(l.projectId);
              return (
                <li key={l.id}>
                  <Panel variant="interactive" className="sm:p-5">
                    <Stack gap="gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{l.title}</p>
                        <p className="mt-1 text-sm text-muted">
                          {amountLabel(l)}
                          {l.active === false ? " · Inactive" : ""}
                          {linked ? ` · ${linked}` : ""}
                        </p>
                      </div>
                      <Cluster gap="gap-2">
                        <Button
                          type="button"
                          size="sm"
                          tone="neutral"
                          onClick={() => void copyLink(l)}
                        >
                          Copy link
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          tone="ghost"
                          onClick={() => openEmail(l)}
                        >
                          Email link
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          tone="ghost"
                          onClick={() => openEdit(l)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          tone="danger"
                          onClick={() => void archiveLink(l)}
                        >
                          Archive
                        </Button>
                      </Cluster>
                    </Stack>
                  </Panel>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl">Transactions</h2>
        {tx.length === 0 ? (
          <EmptyState
            variant="inline"
            title="No payments yet."
            className="border-y border-line py-4"
          />
        ) : (
          <ul className="space-y-3">
            {tx.map((t) => {
              const linked = projectName(t.projectId);
              return (
                <li key={t.id}>
                  <Panel className="text-sm">
                    <p className="font-medium">
                      ${t.netAmount.toFixed(2)} net
                    </p>
                    <p className="mt-1 text-muted">
                      Paid ${t.grossAmount.toFixed(2)} · fee $
                      {t.processingFee.toFixed(2)}
                      {linked ? ` · ${linked}` : ""}
                      {t.status && t.status !== "succeeded"
                        ? ` · ${t.status.replace(/_/g, " ")}`
                        : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {new Date(t.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </Panel>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl">Deposits</h2>
        {loading ? (
          <EmptyState variant="loading" title="Loading deposits…" />
        ) : invoices.length === 0 ? (
          <EmptyState
            title="No deposits yet"
            description="Open a project and use Deposit to create a pay link. It will show up here."
            action={
              <Link href="/admin/projects">
                <Button tone="neutral">Open projects</Button>
              </Link>
            }
          />
        ) : (
          <ul className="space-y-3">
            {invoices.map((inv) => {
              const linked = projectName(inv.projectId);
              return (
                <li key={inv.id}>
                  <Panel className="text-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium">{inv.title}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-muted">
                          <span>${inv.netAmount.toFixed(2)}</span>
                          <StatusBadge
                            domain="invoiceStatus"
                            value={inv.status}
                          />
                          {linked ? <span>· {linked}</span> : null}
                        </p>
                      </div>
                      {inv.projectId ? (
                        <Link href={`/admin/projects/${inv.projectId}`}>
                          <Button size="sm" tone="neutral" className="min-h-11">
                            Open project
                          </Button>
                        </Link>
                      ) : null}
                    </div>
                  </Panel>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Dialog
        open={Boolean(emailTarget)}
        onClose={() => setEmailTarget(null)}
        title="Email link"
      >
        <form onSubmit={sendEmail} className="space-y-4">
          <p className="text-sm text-muted">
            {emailTarget ? `Send “${emailTarget.title}”.` : null}
          </p>
          <Field>
            <Label htmlFor="email-to">Email</Label>
            <Input
              id="email-to"
              type="email"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              required
              autoFocus
            />
          </Field>
          <Cluster>
            <Button type="submit" disabled={emailBusy}>
              {emailBusy ? "Sending…" : "Send"}
            </Button>
            <Button
              type="button"
              tone="ghost"
              onClick={() => setEmailTarget(null)}
            >
              Cancel
            </Button>
          </Cluster>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(editDraft)}
        onClose={() => setEditDraft(null)}
        title="Edit payment link"
      >
        {editDraft ? (
          <form onSubmit={saveEdit} className="space-y-4">
            <Field>
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editDraft.title}
                onChange={(e) =>
                  setEditDraft({ ...editDraft, title: e.target.value })
                }
                required
              />
            </Field>
            <Field>
              <Label htmlFor="edit-mode">Mode</Label>
              <Select
                id="edit-mode"
                value={editDraft.mode}
                onChange={(e) =>
                  setEditDraft({
                    ...editDraft,
                    mode: e.target.value as "fixed" | "customer_chooses",
                  })
                }
              >
                <option value="fixed">Fixed amount</option>
                <option value="customer_chooses">Open amount</option>
              </Select>
            </Field>
            {editDraft.mode === "fixed" ? (
              <Field>
                <Label htmlFor="edit-amount">Amount you receive ($)</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editDraft.amount}
                  onChange={(e) =>
                    setEditDraft({ ...editDraft, amount: e.target.value })
                  }
                  required
                />
              </Field>
            ) : null}
            <Field>
              <Label htmlFor="edit-project">Project</Label>
              <Select
                id="edit-project"
                value={editDraft.projectId}
                onChange={(e) =>
                  setEditDraft({ ...editDraft, projectId: e.target.value })
                }
              >
                <option value="">None</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              <Label htmlFor="edit-active">Status</Label>
              <Select
                id="edit-active"
                value={editDraft.active ? "active" : "inactive"}
                onChange={(e) =>
                  setEditDraft({
                    ...editDraft,
                    active: e.target.value === "active",
                  })
                }
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </Field>
            <Cluster>
              <Button type="submit" disabled={editBusy}>
                {editBusy ? "Saving…" : "Save"}
              </Button>
              <Button
                type="button"
                tone="ghost"
                onClick={() => setEditDraft(null)}
              >
                Cancel
              </Button>
            </Cluster>
          </form>
        ) : null}
      </Dialog>
    </div>
  );
}
