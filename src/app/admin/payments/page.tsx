"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Button,
  Card,
  Cluster,
  Dialog,
  Field,
  Input,
  Label,
  PageHeader,
  Select,
  Stack,
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
  const [links, setLinks] = useState<PaymentLinkTemplate[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tx, setTx] = useState<PaymentTransaction[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [title, setTitle] = useState("Deposit");
  const [amount, setAmount] = useState("200");
  const [mode, setMode] = useState<"fixed" | "customer_chooses">("fixed");
  const [projectId, setProjectId] = useState("");
  const [stripeConfigured, setStripeConfigured] = useState(true);
  const [stripeReady, setStripeReady] = useState(false);
  const [stripeAccount, setStripeAccount] = useState<string | null>(null);
  const [emailTarget, setEmailTarget] = useState<PaymentLinkTemplate | null>(
    null,
  );
  const [emailTo, setEmailTo] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [editBusy, setEditBusy] = useState(false);

  async function load() {
    const [res, connect, projs] = await Promise.all([
      fetch("/api/payments/links"),
      fetch("/api/payments/connect"),
      fetch("/api/clients"),
    ]);
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
      setStripeAccount(c.accountId || null);
    }
    if (projs.ok) {
      const p = await projs.json();
      setProjects(p.projects || p.clients || []);
    }
  }

  useEffect(() => {
    void load();
    const q = new URLSearchParams(window.location.search);
    if (q.get("connect") === "return") {
      void fetch("/api/payments/connect", { method: "PUT" }).then(() => load());
    }
  }, []);

  async function startConnect() {
    const res = await fetch("/api/payments/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "onboard" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      push(String(data.error || "Connect failed"), "danger");
      return;
    }
    if (data.url) {
      window.location.href = data.url as string;
      return;
    }
    push(data.note || "Stripe Connect ready", "success");
    void load();
  }

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
    setTitle("Deposit");
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
        description="Reusable payment links and invoices. Processing fees are passed through so you receive the listed amount."
      />

      <Stack gap="gap-8">
        <Card className="w-full max-w-lg p-5">
          <Stack gap="gap-3">
            <h2 className="font-display text-2xl">Stripe Connect</h2>
            <p className="text-sm text-muted">
              {!stripeConfigured
                ? "Payments aren’t available yet."
                : stripeReady
                  ? `Connected${stripeAccount ? ` · ${stripeAccount}` : ""}.`
                  : "Connect to accept card payments."}
            </p>
            <Button
              type="button"
              tone="neutral"
              disabled={!stripeConfigured}
              onClick={() => void startConnect()}
            >
              {stripeReady ? "Manage Connect" : "Connect Stripe"}
            </Button>
          </Stack>
        </Card>

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
        {links.length === 0 ? (
          <p className="border-y border-line py-4 text-sm text-muted">
            No links yet.
          </p>
        ) : (
          <ul className="space-y-4">
            {links.map((l) => {
              const linked = projectName(l.projectId);
              return (
                <li
                  key={l.id}
                  className="border border-line bg-surface p-4 sm:p-5"
                >
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
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl">Transactions</h2>
        {tx.length === 0 ? (
          <p className="border-y border-line py-4 text-sm text-muted">
            No payments yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {tx.map((t) => {
              const linked = projectName(t.projectId);
              return (
                <li
                  key={t.id}
                  className="border border-line bg-surface p-4 text-sm"
                >
                  <p className="font-medium">
                    ${t.netAmount.toFixed(2)} net
                  </p>
                  <p className="mt-1 text-muted">
                    Paid ${t.grossAmount.toFixed(2)} · fee $
                    {t.processingFee.toFixed(2)}
                    {linked ? ` · ${linked}` : ""}
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
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl">Invoices</h2>
        {invoices.length === 0 ? (
          <p className="border-y border-line py-4 text-sm text-muted">
            Create invoices from a project.
          </p>
        ) : (
          <ul className="space-y-3">
            {invoices.map((inv) => {
              const linked = projectName(inv.projectId);
              return (
                <li
                  key={inv.id}
                  className="border border-line bg-surface p-4 text-sm"
                >
                  <p className="font-medium">{inv.title}</p>
                  <p className="mt-1 text-muted">
                    ${inv.netAmount.toFixed(2)} · {inv.status}
                    {linked ? ` · ${linked}` : ""}
                  </p>
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
