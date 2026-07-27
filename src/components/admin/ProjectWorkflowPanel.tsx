"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Label,
  Select,
  useConfirm,
  useToast,
} from "@/components/ui";
import type {
  Contract,
  ContractTemplate,
  Invoice,
  PackageTemplate,
  Project,
  ProjectSession,
  ProjectWorkflowStep,
  Proposal,
  QuestionnaireResponse,
} from "@/lib/types";
import { defaultContractBody } from "@/lib/contracts/defaults";

const STEPS: { id: ProjectWorkflowStep; label: string }[] = [
  { id: "inquiry", label: "Inquiry" },
  { id: "questionnaire", label: "Questionnaire" },
  { id: "pricing", label: "Pricing" },
  { id: "contract", label: "Contract" },
  { id: "deposit", label: "Deposit" },
  { id: "prep", label: "Prep" },
  { id: "delivery", label: "Delivery" },
];

function stepIndex(step?: ProjectWorkflowStep) {
  const i = STEPS.findIndex((s) => s.id === step);
  return i >= 0 ? i : 0;
}

function absoluteUrl(path: string) {
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

type SessionHint = Pick<ProjectSession, "id" | "type" | "status" | "startsAt"> & {
  currentStep?: string;
  galleryToken?: string;
};

export function ProjectWorkflowPanel({
  project,
  sessions = [],
  onChanged,
}: {
  project: Project;
  sessions?: SessionHint[];
  onChanged?: () => void;
}) {
  const { push } = useToast();
  const { confirm } = useConfirm();
  const [questionnaires, setQuestionnaires] = useState<QuestionnaireResponse[]>(
    [],
  );
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [contractTemplates, setContractTemplates] = useState<
    ContractTemplate[]
  >([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paymentLinks, setPaymentLinks] = useState<
    { id: string; projectId?: string; publicUrl?: string; title: string }[]
  >([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [packages, setPackages] = useState<
    Pick<PackageTemplate, "id" | "name">[]
  >([]);
  const [qTemplates, setQTemplates] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [sendTemplateId, setSendTemplateId] = useState("");
  const [showAnswers, setShowAnswers] = useState(false);
  const [quoteSessionId, setQuoteSessionId] = useState("");
  const [packageId, setPackageId] = useState("");
  const [contractTemplateId, setContractTemplateId] = useState("");
  const [toolSessionId, setToolSessionId] = useState("");
  const [depositAmount, setDepositAmount] = useState("");

  const primarySession = sessions[0];
  const current = project.workflowStep || "inquiry";
  const currentIdx = stepIndex(current);
  const latestSubmitted = useMemo(
    () => questionnaires.find((r) => Boolean(r.submittedAt)),
    [questionnaires],
  );

  const activeSessionId = quoteSessionId || primarySession?.id || "";
  const toolSession = sessions.find((s) => s.id === (toolSessionId || primarySession?.id));
  const proposal = useMemo(() => {
    const forSession = proposals.filter(
      (p) =>
        p.projectId === project.id &&
        (!activeSessionId ||
          p.sessionId === activeSessionId ||
          p.shootId === activeSessionId),
    );
    return (
      forSession.find((p) => p.status === "accepted") ||
      forSession[0] ||
      proposals.find((p) => p.projectId === project.id) ||
      null
    );
  }, [proposals, project.id, activeSessionId]);

  const projectDepositLink = paymentLinks.find(
    (l) => l.projectId === project.id,
  );

  async function loadRelated() {
    const [qs, docs, pay, props] = await Promise.all([
      fetch("/api/documents/questionnaires"),
      fetch("/api/documents/contracts"),
      fetch("/api/payments/links"),
      fetch("/api/proposals"),
    ]);
    if (qs.ok) {
      const data = await qs.json();
      const all = (data.responses || []) as QuestionnaireResponse[];
      setQuestionnaires(all.filter((r) => r.projectId === project.id));
      const tmpls = (data.templates || []) as { id: string; name: string }[];
      setQTemplates(tmpls.map((t) => ({ id: t.id, name: t.name })));
      if (!sendTemplateId && tmpls[0]) setSendTemplateId(tmpls[0].id);
    }
    if (docs.ok) {
      const data = await docs.json();
      const all = (data.contracts || []) as Contract[];
      setContracts(all.filter((c) => c.projectId === project.id));
      const tmpls = (data.templates || []) as ContractTemplate[];
      setContractTemplates(tmpls);
      if (!contractTemplateId && tmpls[0]) setContractTemplateId(tmpls[0].id);
    }
    if (pay.ok) {
      const data = await pay.json();
      const all = (data.invoices || []) as Invoice[];
      setInvoices(all.filter((i) => i.projectId === project.id));
      setPaymentLinks(data.paymentLinks || []);
    }
    if (props.ok) {
      const data = await props.json();
      setProposals((data.proposals || []) as Proposal[]);
      const pkgs = (data.packages || []) as PackageTemplate[];
      setPackages(pkgs.map((p) => ({ id: p.id, name: p.name })));
      if (!packageId && pkgs[0]) setPackageId(pkgs[0].id);
    }
  }

  useEffect(() => {
    void loadRelated();
  }, [project.id]);

  useEffect(() => {
    if (!quoteSessionId && primarySession?.id) {
      setQuoteSessionId(primarySession.id);
    }
    if (!toolSessionId && primarySession?.id) {
      setToolSessionId(primarySession.id);
    }
  }, [primarySession?.id, quoteSessionId, toolSessionId]);

  const qDone = questionnaires.some((r) => Boolean(r.submittedAt));
  const qSent = questionnaires.length > 0;
  const contractSigned = contracts.some((c) => c.status === "completed");
  const contractSent = contracts.length > 0;
  const quoteAccepted = proposals.some(
    (p) => p.projectId === project.id && p.status === "accepted",
  );
  const quoteExists = proposals.some((p) => p.projectId === project.id);
  const depositReceived = proposals.some(
    (p) =>
      p.projectId === project.id && p.depositStatus === "received",
  );
  const depositPaid =
    (project.paidAmount || 0) > 0 ||
    invoices.some((i) => i.status === "paid") ||
    depositReceived;

  const prepHref = toolSession
    ? `/admin/projects/${project.id}/sessions/${toolSession.id}?step=prep`
    : undefined;
  const deliveryHref = toolSession
    ? `/admin/projects/${project.id}/sessions/${toolSession.id}?step=delivery`
    : undefined;

  const pricingDone =
    quoteAccepted || currentIdx > stepIndex("pricing");

  const statusByStep = useMemo(() => {
    return {
      inquiry: "done" as const,
      questionnaire: qDone ? "done" : qSent ? "active" : "todo",
      pricing: pricingDone ? "done" : quoteExists ? "active" : "todo",
      contract: contractSigned ? "done" : contractSent ? "active" : "todo",
      deposit: depositPaid ? "done" : "todo",
      prep:
        toolSession?.currentStep === "shoot-day" ||
        toolSession?.currentStep === "delivery" ||
        toolSession?.currentStep === "wrap"
          ? "done"
          : "todo",
      delivery:
        toolSession?.status === "delivered" ||
        toolSession?.status === "archived" ||
        Boolean(toolSession?.galleryToken)
          ? "done"
          : "todo",
    } satisfies Record<ProjectWorkflowStep, "done" | "active" | "todo">;
  }, [
    qDone,
    qSent,
    pricingDone,
    quoteExists,
    contractSigned,
    contractSent,
    depositPaid,
    toolSession,
  ]);

  async function refresh() {
    await loadRelated();
    onChanged?.();
  }

  async function sendQuestionnaire() {
    setBusy("questionnaire");
    const res = await fetch("/api/documents/questionnaires", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "send",
        projectId: project.id,
        templateId: sendTemplateId || undefined,
      }),
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      push(data.error || "Could not send questionnaire", "danger");
      return;
    }
    push("Questionnaire sent", "success");
    if (data.url) {
      await navigator.clipboard.writeText(data.url).catch(() => undefined);
      push("Link copied", "success");
    }
    await refresh();
  }

  async function createQuote() {
    if (!activeSessionId) {
      push("Add a session first", "danger");
      return;
    }
    if (!packageId) {
      push("Create a package in Prep first", "danger");
      return;
    }
    if (proposal) {
      const ok = await confirm({
        title: "Replace quote?",
        message: "The current public link will be replaced.",
        confirmLabel: "Replace",
        tone: "danger",
      });
      if (!ok) return;
    }
    setBusy("pricing");
    const res = await fetch("/api/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shootId: activeSessionId,
        packageTemplateId: packageId,
      }),
    });
    setBusy(null);
    if (!res.ok) {
      push("Could not create quote", "danger");
      return;
    }
    push(proposal ? "Quote replaced" : "Quote created", "success");
    await refresh();
  }

  async function copyQuoteLink() {
    if (!proposal) return;
    const url = absoluteUrl(`/p/${proposal.token}`);
    try {
      await navigator.clipboard.writeText(url);
      push("Link copied", "success");
      if (proposal.status === "draft") {
        await fetch(`/api/proposals/${proposal.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "sent" }),
        });
        await refresh();
      }
    } catch {
      push("Could not copy", "danger");
    }
  }

  async function emailQuote() {
    if (!proposal) return;
    setBusy("pricing");
    const res = await fetch(`/api/proposals/${proposal.id}/email`, {
      method: "POST",
    });
    setBusy(null);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      push(String(data.error || "Could not email quote"), "danger");
      return;
    }
    push(
      data.emailed === false ? "Quote marked; email skipped" : "Quote emailed",
      data.emailed === false ? "neutral" : "success",
    );
    await refresh();
  }

  async function markQuoteAccepted() {
    if (!proposal) return;
    setBusy("pricing");
    const res = await fetch(`/api/proposals/${proposal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "accepted" }),
    });
    setBusy(null);
    if (!res.ok) {
      push("Could not mark accepted", "danger");
      return;
    }
    push("Quote accepted", "success");
    await refresh();
  }

  async function sendContract() {
    const tmpl = contractTemplates.find((t) => t.id === contractTemplateId);
    setBusy("contract");
    const res = await fetch("/api/documents/contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: project.id,
        title: tmpl?.name || "Photography agreement",
        body:
          tmpl?.body ||
          defaultContractBody(),
        templateId: contractTemplateId || undefined,
        cancelPolicy: tmpl?.cancelPolicy,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      push(String(data.error || "Could not send contract"), "danger");
      return;
    }
    push("Contract sent", "success");
    if (data.url) {
      await navigator.clipboard.writeText(data.url).catch(() => undefined);
      push("Sign link copied", "success");
    }
    await refresh();
  }

  async function copyContractLink() {
    const c = contracts[0];
    if (!c) return;
    try {
      await navigator.clipboard.writeText(absoluteUrl(`/c/${c.token}`));
      push("Sign link copied", "success");
    } catch {
      push("Could not copy", "danger");
    }
  }

  async function copyCancelLink() {
    if (!project.cancelToken) return;
    try {
      await navigator.clipboard.writeText(
        absoluteUrl(`/cancel/${project.cancelToken}`),
      );
      push("Cancel link copied", "success");
    } catch {
      push("Could not copy link", "danger");
    }
  }

  async function createDeposit() {
    setBusy("deposit");
    const res = await fetch(`/api/projects/${project.id}/deposit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: depositAmount ? Number(depositAmount) : undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      push(String(data.error || "Could not create deposit"), "danger");
      return;
    }
    const url = (data.payUrl || data.checkoutUrl) as string | undefined;
    if (url) {
      try {
        await navigator.clipboard.writeText(url);
        push("Deposit link copied", "success");
      } catch {
        push("Deposit created", "success");
      }
    } else {
      push("Deposit created", "success");
    }
    setDepositAmount("");
    await refresh();
  }

  async function copyDepositLink() {
    const url =
      projectDepositLink?.publicUrl ||
      (projectDepositLink
        ? absoluteUrl(`/pay/${projectDepositLink.id}`)
        : undefined);
    if (!url) {
      push("Create a deposit first", "danger");
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      push("Deposit link copied", "success");
    } catch {
      push("Could not copy", "danger");
    }
  }

  async function emailDepositLink() {
    if (!projectDepositLink) {
      push("Create a deposit first", "danger");
      return;
    }
    const to = project.email?.trim();
    if (!to) {
      push("Add project email in Contact", "danger");
      return;
    }
    setBusy("deposit");
    const res = await fetch("/api/payments/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "email",
        id: projectDepositLink.id,
        email: to,
      }),
    });
    setBusy(null);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      push(String(data.error || "Could not email pay link"), "danger");
      return;
    }
    push(
      data.emailed === false ? "Email skipped" : "Pay link emailed",
      data.emailed === false ? "neutral" : "success",
    );
  }

  async function createGallery() {
    const session = toolSession || primarySession;
    if (!session) {
      push("Add a session first", "danger");
      return;
    }
    setBusy("delivery");
    const pin = String(Math.floor(1000 + Math.random() * 9000));
    const res = await fetch("/api/galleries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shootId: session.id,
        title: `${project.name} gallery`,
        pin,
        goLive: false,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      push(String(data.error || "Could not create gallery"), "danger");
      return;
    }
    push("Gallery draft created", "success");
    onChanged?.();
    window.location.href = `/admin/projects/${project.id}/sessions/${session.id}?step=delivery`;
  }

  function badgeTone(
    state: "done" | "active" | "todo",
    isCurrent: boolean,
  ): "success" | "accent" | "neutral" {
    if (state === "done") return "success";
    if (isCurrent || state === "active") return "accent";
    return "neutral";
  }

  function badgeLabel(state: "done" | "active" | "todo", isCurrent: boolean) {
    if (state === "done") return "Done";
    if (isCurrent) return "Current";
    if (state === "active") return "In progress";
    return "Next";
  }

  function sessionLabel(s: SessionHint) {
    const date = s.startsAt?.slice(0, 10);
    return [s.type, date].filter(Boolean).join(" · ") || "Session";
  }

  return (
    <Card className="space-y-5 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-2xl">Workflow</h2>
          <p className="mt-1 text-sm text-muted">
            Current step: {STEPS.find((s) => s.id === current)?.label || "Inquiry"}
          </p>
        </div>
        {project.cancelToken ? (
          <div className="flex min-w-0 flex-col gap-2 sm:items-end">
            <Label>Cancel link</Label>
            <div className="flex flex-wrap gap-2">
              <code className="max-w-full truncate rounded-md border border-line bg-canvas px-2 py-2 text-xs">
                /cancel/{project.cancelToken}
              </code>
              <Button
                type="button"
                tone="neutral"
                className="min-h-11"
                onClick={() => void copyCancelLink()}
              >
                Copy link
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <ol className="space-y-3">
        {STEPS.map((step, idx) => {
          const state = statusByStep[step.id];
          const isCurrent = step.id === current;
          return (
            <li
              key={step.id}
              className="border border-line bg-canvas p-4 sm:flex sm:items-start sm:justify-between sm:gap-4"
            >
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs uppercase tracking-[0.14em] text-muted">
                    {idx + 1}
                  </span>
                  <p className="font-medium">{step.label}</p>
                  <Badge tone={badgeTone(state, isCurrent)}>
                    {badgeLabel(state, isCurrent)}
                  </Badge>
                </div>

                {step.id === "questionnaire" && qSent ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted">
                      {qDone
                        ? "Answers received"
                        : `${questionnaires.length} sent · awaiting answers`}
                    </p>
                    {qDone && latestSubmitted && showAnswers ? (
                      <dl className="space-y-3 rounded-md border border-line bg-surface p-3">
                        {latestSubmitted.questions.map((q) => (
                          <div key={q.id}>
                            <dt className="text-xs uppercase tracking-[0.14em] text-muted">
                              {q.label}
                            </dt>
                            <dd className="mt-1 whitespace-pre-wrap text-sm">
                              {latestSubmitted.answers?.[q.id]?.trim() || "—"}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                  </div>
                ) : null}

                {step.id === "pricing" && proposal ? (
                  <p className="text-sm text-muted">
                    {proposal.title} · {proposal.status}
                    {proposal.status === "accepted" ? " · complete" : ""}
                  </p>
                ) : null}

                {step.id === "contract" && contractSent ? (
                  <p className="text-sm text-muted">
                    {contractSigned
                      ? "Completed"
                      : `${contracts.length} awaiting signature`}
                  </p>
                ) : null}

                {step.id === "deposit" ? (
                  <p className="text-sm text-muted">
                    Paid ${Number(project.paidAmount || 0).toFixed(0)}
                    {invoices.length
                      ? ` · ${invoices.filter((i) => i.status === "paid").length}/${invoices.length} invoices`
                      : ""}
                    {depositPaid ? " · complete" : ""}
                  </p>
                ) : null}
              </div>

              <div className="mt-3 flex w-full flex-col gap-2 sm:mt-0 sm:max-w-xs sm:items-stretch">
                {step.id === "questionnaire" ? (
                  <>
                    {qTemplates.length > 0 ? (
                      <Field>
                        <Label htmlFor={`q-tmpl-${project.id}`}>Template</Label>
                        <Select
                          id={`q-tmpl-${project.id}`}
                          value={sendTemplateId}
                          onChange={(e) => setSendTemplateId(e.target.value)}
                        >
                          {qTemplates.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    ) : null}
                    <Button
                      className="min-h-11"
                      pending={busy === "questionnaire"}
                      pendingLabel="Sending…"
                      onClick={() => void sendQuestionnaire()}
                    >
                      {qSent ? "Send again" : "Send questionnaire"}
                    </Button>
                    {qDone && latestSubmitted ? (
                      <Button
                        type="button"
                        tone="neutral"
                        className="min-h-11"
                        onClick={() => setShowAnswers((v) => !v)}
                      >
                        {showAnswers ? "Hide answers" : "View answers"}
                      </Button>
                    ) : null}
                    {questionnaires[0] ? (
                      <a
                        className="text-sm text-accent"
                        href={`/q/${questionnaires[0].token}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Client link
                      </a>
                    ) : null}
                  </>
                ) : null}

                {step.id === "pricing" ? (
                  <>
                    {sessions.length > 1 ? (
                      <Field>
                        <Label>Session</Label>
                        <Select
                          value={activeSessionId}
                          onChange={(e) => setQuoteSessionId(e.target.value)}
                        >
                          {sessions.map((s) => (
                            <option key={s.id} value={s.id}>
                              {sessionLabel(s)}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    ) : null}
                    <Field>
                      <Label>Package</Label>
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
                      className="min-h-11"
                      pending={busy === "pricing"}
                      pendingLabel="Working…"
                      disabled={!packageId || !activeSessionId}
                      onClick={() => void createQuote()}
                    >
                      {proposal ? "Replace quote" : "Create quote"}
                    </Button>
                    {proposal ? (
                      <>
                        <Button
                          tone="neutral"
                          className="min-h-11"
                          onClick={() => void copyQuoteLink()}
                        >
                          Copy link
                        </Button>
                        <Button
                          tone="neutral"
                          className="min-h-11"
                          pending={busy === "pricing"}
                          onClick={() => void emailQuote()}
                        >
                          Email quote
                        </Button>
                        {proposal.status !== "accepted" ? (
                          <Button
                            tone="ghost"
                            className="min-h-11"
                            pending={busy === "pricing"}
                            onClick={() => void markQuoteAccepted()}
                          >
                            Mark accepted
                          </Button>
                        ) : null}
                        <a
                          className="text-sm text-accent"
                          href={`/p/${proposal.token}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Preview
                        </a>
                      </>
                    ) : (
                      <Link href="/admin/prep" className="text-sm text-accent">
                        Manage packages
                      </Link>
                    )}
                  </>
                ) : null}

                {step.id === "contract" ? (
                  <>
                    {contractTemplates.length > 0 ? (
                      <Field>
                        <Label>Template</Label>
                        <Select
                          value={contractTemplateId}
                          onChange={(e) =>
                            setContractTemplateId(e.target.value)
                          }
                        >
                          {contractTemplates.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    ) : null}
                    <Button
                      className="min-h-11"
                      pending={busy === "contract"}
                      pendingLabel="Sending…"
                      onClick={() => void sendContract()}
                    >
                      {contractSent ? "Send again" : "Send agreement"}
                    </Button>
                    {contracts[0] ? (
                      <Button
                        tone="neutral"
                        className="min-h-11"
                        onClick={() => void copyContractLink()}
                      >
                        Copy sign link
                      </Button>
                    ) : null}
                  </>
                ) : null}

                {step.id === "deposit" ? (
                  <>
                    {!depositPaid ? (
                      <Field>
                        <Label htmlFor={`dep-${project.id}`}>
                          Amount ($)
                        </Label>
                        <Input
                          id={`dep-${project.id}`}
                          type="number"
                          min={1}
                          step="1"
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(e.target.value)}
                          placeholder="Optional if set on session type"
                        />
                      </Field>
                    ) : null}
                    <Button
                      className="min-h-11"
                      pending={busy === "deposit"}
                      pendingLabel="Creating…"
                      disabled={depositPaid}
                      onClick={() => void createDeposit()}
                    >
                      {depositPaid ? "Paid" : "Create deposit"}
                    </Button>
                    {projectDepositLink || invoices.length > 0 ? (
                      <>
                        <Button
                          tone="neutral"
                          className="min-h-11"
                          onClick={() => void copyDepositLink()}
                        >
                          Copy pay link
                        </Button>
                        {!depositPaid && projectDepositLink ? (
                          <Button
                            tone="neutral"
                            className="min-h-11"
                            pending={busy === "deposit"}
                            pendingLabel="Sending…"
                            onClick={() => void emailDepositLink()}
                          >
                            Email pay link
                          </Button>
                        ) : null}
                      </>
                    ) : null}
                  </>
                ) : null}

                {step.id === "prep" ? (
                  <>
                    {sessions.length > 1 ? (
                      <Field>
                        <Label>Session</Label>
                        <Select
                          value={toolSession?.id || ""}
                          onChange={(e) => setToolSessionId(e.target.value)}
                        >
                          {sessions.map((s) => (
                            <option key={s.id} value={s.id}>
                              {sessionLabel(s)}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    ) : null}
                    {prepHref ? (
                      <Link href={prepHref}>
                        <Button className="min-h-11 w-full">Open prep</Button>
                      </Link>
                    ) : (
                      <p className="text-sm text-muted">Add a session first</p>
                    )}
                  </>
                ) : null}

                {step.id === "delivery" ? (
                  <>
                    {sessions.length > 1 ? (
                      <Field>
                        <Label>Session</Label>
                        <Select
                          value={toolSession?.id || ""}
                          onChange={(e) => setToolSessionId(e.target.value)}
                        >
                          {sessions.map((s) => (
                            <option key={s.id} value={s.id}>
                              {sessionLabel(s)}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    ) : null}
                    {deliveryHref ? (
                      <Link href={deliveryHref}>
                        <Button className="min-h-11 w-full">
                          Open delivery
                        </Button>
                      </Link>
                    ) : null}
                    {!toolSession?.galleryToken ? (
                      <Button
                        className="min-h-11"
                        tone="neutral"
                        pending={busy === "delivery"}
                        disabled={!toolSession && !primarySession}
                        onClick={() => void createGallery()}
                      >
                        Create gallery
                      </Button>
                    ) : (
                      <a
                        className="text-sm text-accent"
                        href={`/g/${toolSession.galleryToken}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open gallery
                      </a>
                    )}
                  </>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
