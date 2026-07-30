"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ActionStack,
  Badge,
  Button,
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
import {
  isBalanceInvoiceTitle,
  isDepositInvoiceTitle,
  projectQuotedTotal,
  projectRemainingBalance,
} from "@/lib/payments/project-balance";
import {
  newIdempotencyKey,
  withIdempotencyHeaders,
} from "@/lib/client/idempotency-key";
import { confirmReplaceQuote } from "@/lib/destructive-confirm";
import {
  BOOK_STEPS,
  HANDOFF_COPY,
  PROJECT_PATH_STEPS,
  SESSION_STEPS,
  nextProjectPathStep,
  previousProjectPathStep,
  projectPathIndex,
  workflowStepLabel,
} from "@/lib/workflow/path";

function absoluteUrl(path: string) {
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

type SessionHint = Pick<ProjectSession, "id" | "type" | "status" | "startsAt"> & {
  currentStep?: string;
  galleryToken?: string;
  galleryStatus?: string;
  prepComplete?: boolean;
  deliveryComplete?: boolean;
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
    {
      id: string;
      projectId?: string;
      publicUrl?: string;
      title: string;
      archived?: boolean;
    }[]
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
  const [balanceAmount, setBalanceAmount] = useState("");
  /** Mobile: which step card is expanded (follows current when it advances). */
  const [viewStep, setViewStep] = useState<ProjectWorkflowStep>(
    () => project.workflowStep || "inquiry",
  );

  const primarySession = sessions[0];
  const current = project.workflowStep || "inquiry";
  const viewIdx = projectPathIndex(viewStep);
  const progressIdx = projectPathIndex(current);
  const showHandoffCard =
    viewStep === "deposit" || viewStep === "prep" || viewIdx >= BOOK_STEPS.length;

  useEffect(() => {
    setViewStep(current);
  }, [current]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#workflow") return;
    requestAnimationFrame(() => {
      document.getElementById("workflow")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, []);

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

  const projectDepositLink =
    paymentLinks.find(
      (l) =>
        l.projectId === project.id &&
        !l.archived &&
        isDepositInvoiceTitle(l.title),
    ) ||
    paymentLinks.find(
      (l) =>
        l.projectId === project.id &&
        !l.archived &&
        !isBalanceInvoiceTitle(l.title),
    );
  const projectBalanceLink = paymentLinks.find(
    (l) =>
      l.projectId === project.id &&
      !l.archived &&
      isBalanceInvoiceTitle(l.title),
  );

  async function loadRelated() {
    const res = await fetch(`/api/projects/${project.id}/related`);
    if (!res.ok) {
      push("Could not load workflow data — retry from refresh", "danger");
      return;
    }
    const data = await res.json();
    setQuestionnaires((data.questionnaires || []) as QuestionnaireResponse[]);
    setQTemplates(
      ((data.questionnaireTemplates || []) as { id: string; name: string }[]).map(
        (t) => ({ id: t.id, name: t.name }),
      ),
    );
    if (!sendTemplateId && data.questionnaireTemplates?.[0]) {
      setSendTemplateId(data.questionnaireTemplates[0].id);
    }
    setContracts((data.contracts || []) as Contract[]);
    setContractTemplates((data.contractTemplates || []) as ContractTemplate[]);
    if (!contractTemplateId && data.contractTemplates?.length) {
      const preferred = (
        data.legalDefaults as { defaultContractTemplateId?: string } | undefined
      )?.defaultContractTemplateId;
      const match = preferred
        ? (data.contractTemplates as ContractTemplate[]).find(
            (t) => t.id === preferred,
          )
        : undefined;
      setContractTemplateId(
        match?.id || data.contractTemplates[0].id,
      );
    }
    setInvoices((data.invoices || []) as Invoice[]);
    setPaymentLinks(data.paymentLinks || []);
    setProposals((data.proposals || []) as Proposal[]);
    const pkgs = (data.packages || []) as PackageTemplate[];
    setPackages(pkgs.map((p) => ({ id: p.id, name: p.name })));
    if (!packageId && pkgs[0]) setPackageId(pkgs[0].id);
    const defaultDeposit = (
      data.paymentDefaults as { defaultDepositAmount?: number } | undefined
    )?.defaultDepositAmount;
    if (
      !depositAmount &&
      defaultDeposit != null &&
      Number.isFinite(defaultDeposit) &&
      defaultDeposit > 0
    ) {
      setDepositAmount(String(defaultDeposit));
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
    invoices.some(
      (i) => i.status === "paid" && isDepositInvoiceTitle(i.title),
    ) ||
    depositReceived ||
    invoices.some(
      (i) => i.status === "paid" && !isBalanceInvoiceTitle(i.title),
    );

  const quotedTotal = projectQuotedTotal(proposals, project.id);
  const remainingBalance = projectRemainingBalance({
    quotedTotal,
    paidAmount: project.paidAmount,
  });
  const balancePaid =
    remainingBalance === 0 ||
    invoices.some(
      (i) => i.status === "paid" && isBalanceInvoiceTitle(i.title),
    );

  useEffect(() => {
    if (balanceAmount) return;
    if (remainingBalance != null && remainingBalance > 0) {
      setBalanceAmount(String(Math.round(remainingBalance)));
    }
  }, [remainingBalance, balanceAmount]);

  const prepHref = toolSession
    ? `/admin/projects/${project.id}/sessions/${toolSession.id}?step=prep`
    : undefined;
  const deliveryHref = toolSession
    ? `/admin/projects/${project.id}/sessions/${toolSession.id}?step=delivery`
    : undefined;

  const sessionUnlocked = depositPaid;
  const nextStep = nextProjectPathStep(current);
  const prevStep = previousProjectPathStep(current);

  const statusByStep = useMemo(() => {
    const prepReady = Boolean(
      toolSession?.prepComplete ||
        toolSession?.currentStep === "shoot-day" ||
        toolSession?.currentStep === "delivery" ||
        toolSession?.currentStep === "wrap",
    );
    const deliveryReady = Boolean(
      toolSession?.deliveryComplete ||
        toolSession?.status === "delivered" ||
        toolSession?.status === "archived" ||
        toolSession?.galleryStatus === "live" ||
        toolSession?.galleryStatus === "archived",
    );

    return {
      inquiry: "done" as const,
      questionnaire: qDone ? "done" : qSent ? "active" : "todo",
      pricing: quoteAccepted ? "done" : quoteExists ? "active" : "todo",
      contract: contractSigned ? "done" : contractSent ? "active" : "todo",
      deposit: depositPaid ? "done" : "todo",
      prep: !sessionUnlocked
        ? "todo"
        : prepReady
          ? "done"
          : current === "prep"
            ? "active"
            : "todo",
      delivery: !sessionUnlocked
        ? "todo"
        : deliveryReady
          ? "done"
          : current === "delivery"
            ? "active"
            : "todo",
    } satisfies Record<ProjectWorkflowStep, "done" | "active" | "todo">;
  }, [
    qDone,
    qSent,
    quoteAccepted,
    quoteExists,
    contractSigned,
    contractSent,
    depositPaid,
    sessionUnlocked,
    toolSession,
    current,
  ]);

  async function setWorkflowStep(step: ProjectWorkflowStep) {
    setBusy("workflow");
    const res = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workflowStep: step }),
    });
    setBusy(null);
    if (!res.ok) {
      push("Could not update workflow", "danger");
      return;
    }
    push("Workflow updated", "success");
    await refresh();
  }

  async function advanceWorkflow() {
    if (!nextStep) return;
    await setWorkflowStep(nextStep);
  }

  async function reopenStep(step: ProjectWorkflowStep) {
    const ok = await confirm({
      title: "Reopen step?",
      message: `Set current step to ${PROJECT_PATH_STEPS.find((s) => s.id === step)?.label || step}.`,
      confirmLabel: "Reopen",
      tone: "danger",
    });
    if (!ok) return;
    await setWorkflowStep(step);
  }

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
      push("Create a package in Library first", "danger");
      return;
    }
    if (proposal) {
      const ok = await confirm(confirmReplaceQuote());
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
    if (!proposal || busy) return;
    setBusy("pricing");
    const res = await fetch(`/api/proposals/${proposal.id}/email`, {
      method: "POST",
      headers: withIdempotencyHeaders(newIdempotencyKey()),
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
    const ok = await confirm({
      title: "Mark quote accepted?",
      message:
        `Skips the client accepting the quote link. Moves to ${workflowStepLabel("contract")}, then ${workflowStepLabel("deposit")}.`,
      confirmLabel: "Mark accepted",
      tone: "neutral",
    });
    if (!ok) return;
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
    push(
      `Quote accepted · continue with ${workflowStepLabel("contract")}`,
      "success",
    );
    await refresh();
    if (typeof document !== "undefined") {
      document.getElementById("workflow")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }

  async function sendContract() {
    if (busy) return;
    const tmpl = contractTemplates.find((t) => t.id === contractTemplateId);
    setBusy("contract");
    const res = await fetch("/api/documents/contracts", {
      method: "POST",
      headers: withIdempotencyHeaders(newIdempotencyKey(), {
        "Content-Type": "application/json",
      }),
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
    if (busy) return;
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
      headers: withIdempotencyHeaders(newIdempotencyKey(), {
        "Content-Type": "application/json",
      }),
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

  async function createBalance() {
    setBusy("balance");
    const res = await fetch(`/api/projects/${project.id}/balance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: balanceAmount ? Number(balanceAmount) : undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      push(String(data.error || "Could not create balance"), "danger");
      return;
    }
    const url = (data.payUrl || data.checkoutUrl) as string | undefined;
    if (url) {
      try {
        await navigator.clipboard.writeText(url);
        push("Balance link copied", "success");
      } catch {
        push("Balance created", "success");
      }
    } else {
      push("Balance created", "success");
    }
    await refresh();
  }

  async function copyBalanceLink() {
    const url =
      projectBalanceLink?.publicUrl ||
      (projectBalanceLink
        ? absoluteUrl(`/pay/${projectBalanceLink.id}`)
        : undefined);
    if (!url) {
      push("Create a balance link first", "danger");
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      push("Balance link copied", "success");
    } catch {
      push("Could not copy", "danger");
    }
  }

  async function emailBalanceLink() {
    if (busy) return;
    if (!projectBalanceLink) {
      push("Create a balance link first", "danger");
      return;
    }
    const to = project.email?.trim();
    if (!to) {
      push("Add project email in Contact", "danger");
      return;
    }
    setBusy("balance");
    const res = await fetch("/api/payments/links", {
      method: "POST",
      headers: withIdempotencyHeaders(newIdempotencyKey(), {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        action: "email",
        id: projectBalanceLink.id,
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
    try {
      await navigator.clipboard.writeText(pin);
      push(`Gallery created · PIN ${pin} copied`, "success");
    } catch {
      push(`Gallery created · PIN ${pin}`, "success");
    }
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

  function badgeLabel(
    state: "done" | "active" | "todo",
    isCurrent: boolean,
    stepId: ProjectWorkflowStep,
  ) {
    if (
      !sessionUnlocked &&
      (stepId === "prep" || stepId === "delivery")
    ) {
      return "After payment";
    }
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
    <section id="workflow" className="space-y-5 scroll-mt-24">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-2xl">Workflow</h2>
          <p className="mt-1 text-sm text-muted">
            Quote to delivery · {workflowStepLabel(current)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {nextStep ? (
              <Button
                type="button"
                tone="neutral"
                className="min-h-11"
                pending={busy === "workflow"}
                pendingLabel="Updating…"
                onClick={() => void advanceWorkflow()}
              >
                Advance
              </Button>
            ) : null}
            {prevStep ? (
              <Button
                type="button"
                tone="ghost"
                className="min-h-11"
                pending={busy === "workflow"}
                onClick={() => void reopenStep(prevStep)}
              >
                Reopen previous
              </Button>
            ) : null}
          </div>
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

      <div className="space-y-3 md:hidden">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted">
            Step {viewIdx + 1} of {PROJECT_PATH_STEPS.length}
          </p>
          <p className="mt-1 font-medium text-ink">
            {PROJECT_PATH_STEPS[viewIdx]?.label || "Workflow"}
          </p>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-line">
            <div
              className="h-full bg-ink transition-all"
              style={{
                width: `${((progressIdx + 1) / PROJECT_PATH_STEPS.length) * 100}%`,
              }}
            />
          </div>
        </div>
        <Field>
          <Label htmlFor="workflow-step-jump" className="sr-only">
            Jump to step
          </Label>
          <Select
            id="workflow-step-jump"
            value={viewStep}
            onChange={(e) =>
              setViewStep(e.target.value as ProjectWorkflowStep)
            }
            aria-label="Jump to workflow step"
          >
            {PROJECT_PATH_STEPS.map((s, i) => (
              <option key={s.id} value={s.id}>
                {i + 1}. {s.label}
                {s.id === current ? " · Current" : ""}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <ol className="divide-y divide-line border-y border-line">
        {BOOK_STEPS.map((step, idx) => {
          const state = statusByStep[step.id];
          const isCurrent = step.id === current;
          const mobileShow = viewStep === step.id;
          return (
            <li
              key={step.id}
              className={`py-4 sm:flex sm:items-start sm:justify-between sm:gap-4${
                mobileShow ? "" : " max-md:hidden"
              }`}
            >
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs uppercase tracking-[0.14em] text-muted">
                    {idx + 1}
                  </span>
                  <p className="font-medium">{step.label}</p>
                  <Badge tone={badgeTone(state, isCurrent)}>
                    {badgeLabel(state, isCurrent, step.id)}
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
                    <ActionStack
                      primaryId="send"
                      actions={[
                        {
                          id: "send",
                          label: qSent ? "Send again" : "Send questionnaire",
                          tone: "accent",
                          pending: busy === "questionnaire",
                          pendingLabel: "Sending…",
                          onClick: () => void sendQuestionnaire(),
                        },
                        ...(qDone && latestSubmitted
                          ? [
                              {
                                id: "answers",
                                label: showAnswers
                                  ? "Hide answers"
                                  : "View answers",
                                tone: "neutral" as const,
                                onClick: () => setShowAnswers((v) => !v),
                              },
                            ]
                          : []),
                        ...(questionnaires[0]
                          ? [
                              {
                                id: "questionnaire-link",
                                label: "Questionnaire link",
                                href: `/q/${questionnaires[0].token}`,
                                external: true,
                                tone: "ghost" as const,
                              },
                            ]
                          : []),
                      ]}
                    />
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
                    <ActionStack
                      primaryId="quote"
                      actions={[
                        {
                          id: "quote",
                          label: proposal ? "Replace quote" : "Create quote",
                          tone: "accent",
                          pending: busy === "pricing",
                          pendingLabel: "Working…",
                          disabled: !packageId || !activeSessionId,
                          onClick: () => void createQuote(),
                        },
                        ...(proposal
                          ? [
                              {
                                id: "copy",
                                label: "Copy link",
                                tone: "neutral" as const,
                                onClick: () => void copyQuoteLink(),
                              },
                              {
                                id: "email",
                                label: "Email quote",
                                tone: "neutral" as const,
                                pending: busy === "pricing",
                                onClick: () => void emailQuote(),
                              },
                              ...(proposal.status !== "accepted"
                                ? [
                                    {
                                      id: "accept",
                                      label: "Mark accepted",
                                      tone: "ghost" as const,
                                      pending: busy === "pricing",
                                      onClick: () => void markQuoteAccepted(),
                                    },
                                  ]
                                : [
                                    {
                                      id: "continue-contract",
                                      label: `Continue — ${workflowStepLabel("contract")}`,
                                      tone: "neutral" as const,
                                      onClick: () => {
                                        document
                                          .getElementById("workflow")
                                          ?.scrollIntoView({
                                            behavior: "smooth",
                                            block: "start",
                                          });
                                      },
                                    },
                                  ]),
                              {
                                id: "preview",
                                label: "Preview",
                                href: `/p/${proposal.token}`,
                                external: true,
                                tone: "ghost" as const,
                              },
                            ]
                          : [
                              {
                                id: "packages",
                                label: "Manage packages",
                                href: "/admin/prep",
                                tone: "ghost" as const,
                              },
                            ]),
                      ]}
                    />
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
                    <ActionStack
                      primaryId="send"
                      actions={[
                        {
                          id: "send",
                          label: contractSent
                            ? "Send again"
                            : "Send agreement",
                          tone: "accent",
                          pending: busy === "contract",
                          pendingLabel: "Sending…",
                          onClick: () => void sendContract(),
                        },
                        ...(contracts[0]
                          ? [
                              {
                                id: "copy",
                                label: "Copy sign link",
                                tone: "neutral" as const,
                                onClick: () => void copyContractLink(),
                              },
                            ]
                          : []),
                      ]}
                    />
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
                          placeholder="Optional if set on session type or defaults"
                        />
                      </Field>
                    ) : null}
                    <ActionStack
                      primaryId={
                        depositPaid && prepHref ? "continue-prep" : "deposit"
                      }
                      actions={[
                        ...(depositPaid && prepHref
                          ? [
                              {
                                id: "continue-prep",
                                label: "Continue to prep",
                                href: prepHref,
                                tone: "accent" as const,
                              },
                            ]
                          : [
                              {
                                id: "deposit",
                                label: depositPaid ? "Paid" : "Create deposit",
                                tone: "accent" as const,
                                pending: busy === "deposit",
                                pendingLabel: "Creating…",
                                disabled: depositPaid,
                                onClick: () => void createDeposit(),
                              },
                            ]),
                        ...(projectDepositLink || invoices.length > 0
                          ? [
                              {
                                id: "copy",
                                label: "Copy pay link",
                                tone: "neutral" as const,
                                onClick: () => void copyDepositLink(),
                              },
                              ...(!depositPaid && projectDepositLink
                                ? [
                                    {
                                      id: "email",
                                      label: "Email pay link",
                                      tone: "neutral" as const,
                                      pending: busy === "deposit",
                                      pendingLabel: "Sending…",
                                      onClick: () => void emailDepositLink(),
                                    },
                                  ]
                                : []),
                              {
                                id: "payments",
                                label: "View in Payments",
                                href: "/admin/payments",
                                tone: "ghost" as const,
                              },
                            ]
                          : []),
                      ]}
                    />
                  </>
                ) : null}
                {!isCurrent &&
                projectPathIndex(step.id) < projectPathIndex(current) ? (
                  <Button
                    type="button"
                    tone="ghost"
                    className="min-h-11"
                    pending={busy === "workflow"}
                    onClick={() => void reopenStep(step.id)}
                  >
                    Reopen
                  </Button>
                ) : null}
                {isCurrent && nextStep ? (
                  <Button
                    type="button"
                    tone="ghost"
                    className="min-h-11"
                    pending={busy === "workflow"}
                    pendingLabel="Updating…"
                    onClick={() => void advanceWorkflow()}
                  >
                    Mark complete
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}

        <li
          className={`py-4${showHandoffCard ? "" : " max-md:hidden"}`}
        >
          <p className="text-sm text-ink">{HANDOFF_COPY}</p>
          <p className="mt-1 text-sm text-muted">
            Plan and deliver unlock when payment clears.
          </p>
        </li>

        {SESSION_STEPS.map((step, idx) => {
          const state = statusByStep[step.id];
          const isCurrent = step.id === current;
          const pathIdx = BOOK_STEPS.length + idx;
          const mobileShow = viewStep === step.id;
          return (
            <li
              key={step.id}
              className={`py-4 sm:flex sm:items-start sm:justify-between sm:gap-4${
                mobileShow ? "" : " max-md:hidden"
              }`}
            >
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs uppercase tracking-[0.14em] text-muted">
                    {pathIdx + 1}
                  </span>
                  <p className="font-medium">{step.label}</p>
                  <Badge tone={badgeTone(state, isCurrent)}>
                    {badgeLabel(state, isCurrent, step.id)}
                  </Badge>
                </div>
                {!sessionUnlocked ? (
                  <p className="text-sm text-muted">{HANDOFF_COPY}.</p>
                ) : step.id === "prep" ? (
                  <p className="text-sm text-muted">
                    Continues: plan → shoot day → deliver → wrap
                  </p>
                ) : null}
              </div>

              <div className="mt-3 flex w-full flex-col gap-2 sm:mt-0 sm:max-w-xs sm:items-stretch">
                {step.id === "prep" && sessionUnlocked ? (
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
                        <Button className="min-h-11 w-full">
                          Open plan
                        </Button>
                      </Link>
                    ) : (
                      <p className="text-sm text-muted">Add a session first</p>
                    )}
                  </>
                ) : null}

                {step.id === "delivery" && sessionUnlocked ? (
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
                    <ActionStack
                      primaryId={deliveryHref ? "open" : "create-gallery"}
                      actions={[
                        ...(deliveryHref
                          ? [
                              {
                                id: "open",
                                label: "Open delivery",
                                href: deliveryHref,
                                tone: "accent" as const,
                              },
                            ]
                          : []),
                        ...(!toolSession?.galleryToken
                          ? [
                              {
                                id: "create-gallery",
                                label: "Create gallery",
                                tone: "neutral" as const,
                                pending: busy === "delivery",
                                disabled: !toolSession && !primarySession,
                                onClick: () => void createGallery(),
                              },
                            ]
                          : [
                              {
                                id: "gallery",
                                label: "Open gallery",
                                href: `/g/${toolSession.galleryToken}`,
                                external: true,
                                tone: "ghost" as const,
                              },
                            ]),
                      ]}
                    />
                    <div className="border-t border-line pt-3">
                      <p className="mb-2 text-sm text-muted">
                        {balancePaid
                          ? "Balance paid"
                          : remainingBalance != null
                            ? `Remaining $${Math.round(remainingBalance)}`
                            : "Remaining balance"}
                        {quotedTotal != null
                          ? ` · quote $${Math.round(quotedTotal)}`
                          : ""}
                      </p>
                      {!balancePaid ? (
                        <Field className="mb-2">
                          <Label htmlFor={`bal-${project.id}`}>
                            Balance ($)
                          </Label>
                          <Input
                            id={`bal-${project.id}`}
                            type="number"
                            min={1}
                            step="1"
                            value={balanceAmount}
                            onChange={(e) => setBalanceAmount(e.target.value)}
                            placeholder={
                              remainingBalance != null
                                ? String(Math.round(remainingBalance))
                                : "Amount"
                            }
                          />
                        </Field>
                      ) : null}
                      <ActionStack
                        primaryId="balance"
                        actions={[
                          {
                            id: "balance",
                            label: balancePaid
                              ? "Paid"
                              : projectBalanceLink
                                ? "Create again"
                                : "Create balance link",
                            tone: "accent",
                            pending: busy === "balance",
                            pendingLabel: "Creating…",
                            disabled: balancePaid,
                            onClick: () => void createBalance(),
                          },
                          ...(projectBalanceLink
                            ? [
                                {
                                  id: "copy-balance",
                                  label: "Copy balance link",
                                  tone: "neutral" as const,
                                  onClick: () => void copyBalanceLink(),
                                },
                                ...(!balancePaid
                                  ? [
                                      {
                                        id: "email-balance",
                                        label: "Email balance link",
                                        tone: "neutral" as const,
                                        pending: busy === "balance",
                                        pendingLabel: "Sending…",
                                        onClick: () => void emailBalanceLink(),
                                      },
                                    ]
                                  : []),
                              ]
                            : []),
                        ]}
                      />
                    </div>
                  </>
                ) : null}
                {!isCurrent &&
                projectPathIndex(step.id) < projectPathIndex(current) ? (
                  <Button
                    type="button"
                    tone="ghost"
                    className="min-h-11"
                    pending={busy === "workflow"}
                    onClick={() => void reopenStep(step.id)}
                  >
                    Reopen
                  </Button>
                ) : null}
                {isCurrent && nextStep ? (
                  <Button
                    type="button"
                    tone="ghost"
                    className="min-h-11"
                    pending={busy === "workflow"}
                    pendingLabel="Updating…"
                    onClick={() => void advanceWorkflow()}
                  >
                    Mark complete
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
