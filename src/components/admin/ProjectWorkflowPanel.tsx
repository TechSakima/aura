"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
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
import { adminPreviewHref } from "@/lib/admin-preview-paths";
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
import { mutateJson } from "@/lib/client/mutation";
import { toastAfterEmailAttempt } from "@/lib/copy/email-toast";
import { confirmReplaceQuote } from "@/lib/destructive-confirm";
import {
  confirmUnsetPricing,
  hasUnsetPricing,
} from "@/lib/packages/pricing-ready";
import { PROJECT_EMAIL_REQUIRED } from "@/lib/project-contact";
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
import {
  aggregateSessionStepState,
  isSessionDeliveryReady,
  isSessionPrepReady,
  multiSessionBadgeLabel,
} from "@/lib/workflow/session-readiness";

function absoluteUrl(path: string) {
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

type SessionHint = Pick<
  ProjectSession,
  "id" | "type" | "status" | "startsAt" | "adminSlug"
> & {
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
  const router = useRouter();
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
    Pick<PackageTemplate, "id" | "name" | "defaultPricing">[]
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
  const [inlineSessionType, setInlineSessionType] = useState(
    () => project.type?.trim() || "Wedding",
  );
  const [inlineSessionDate, setInlineSessionDate] = useState("");
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
    const result = await mutateJson<{
      questionnaires?: QuestionnaireResponse[];
      questionnaireTemplates?: { id: string; name: string }[];
      contracts?: Contract[];
      contractTemplates?: ContractTemplate[];
      legalDefaults?: { defaultContractTemplateId?: string };
      invoices?: Invoice[];
      paymentLinks?: typeof paymentLinks;
      proposals?: Proposal[];
      packages?: PackageTemplate[];
      paymentDefaults?: { defaultDepositAmount?: number };
    }>(`/api/projects/${project.id}/related`, undefined, { action: "load" });
    if (!result.ok) {
      push(result.errorMessage, "danger");
      return;
    }
    const data = result.data;
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
      const preferred = data.legalDefaults?.defaultContractTemplateId;
      const match = preferred
        ? (data.contractTemplates as ContractTemplate[]).find(
            (t) => t.id === preferred,
          )
        : undefined;
      setContractTemplateId(
        match?.id || data.contractTemplates[0]!.id,
      );
    }
    setInvoices((data.invoices || []) as Invoice[]);
    setPaymentLinks(data.paymentLinks || []);
    setProposals((data.proposals || []) as Proposal[]);
    const pkgs = (data.packages || []) as PackageTemplate[];
    setPackages(
      pkgs.map((p) => ({
        id: p.id,
        name: p.name,
        defaultPricing: p.defaultPricing || [],
      })),
    );
    if (!packageId && pkgs[0]) setPackageId(pkgs[0].id);
    const defaultDeposit = data.paymentDefaults?.defaultDepositAmount;
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
  const contractSent = contracts.some(
    (c) => c.status === "awaiting_signature" || c.status === "completed",
  );
  const awaitingCount = contracts.filter(
    (c) => c.status === "awaiting_signature",
  ).length;
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
    ? `/admin/projects/${project.adminSlug || project.id}/sessions/${toolSession.adminSlug || toolSession.id}?step=prep`
    : undefined;
  const deliveryHref = toolSession
    ? `/admin/projects/${project.adminSlug || project.id}/sessions/${toolSession.adminSlug || toolSession.id}?step=delivery`
    : undefined;

  const sessionUnlocked = depositPaid;
  const nextStep = nextProjectPathStep(current);
  const prevStep = previousProjectPathStep(current);

  const sessionStepAgg = useMemo(() => {
    const open = sessions.filter((s) => s.status !== "archived");
    const total = open.length;
    const prepReadyCount = open.filter((s) => isSessionPrepReady(s)).length;
    const deliveryReadyCount = open.filter((s) =>
      isSessionDeliveryReady(s),
    ).length;
    return {
      prep: aggregateSessionStepState({
        unlocked: sessionUnlocked,
        currentIsStep: current === "prep",
        readyCount: prepReadyCount,
        total,
      }),
      delivery: aggregateSessionStepState({
        unlocked: sessionUnlocked,
        currentIsStep: current === "delivery",
        readyCount: deliveryReadyCount,
        total,
      }),
    };
  }, [sessions, sessionUnlocked, current]);

  const statusByStep = useMemo(() => {
    return {
      inquiry: "done" as const,
      questionnaire: qDone ? "done" : qSent ? "active" : "todo",
      pricing: quoteAccepted ? "done" : quoteExists ? "active" : "todo",
      contract: contractSigned ? "done" : contractSent ? "active" : "todo",
      deposit: depositPaid ? "done" : "todo",
      prep: sessionStepAgg.prep.state,
      delivery: sessionStepAgg.delivery.state,
    } satisfies Record<ProjectWorkflowStep, "done" | "active" | "todo">;
  }, [
    qDone,
    qSent,
    quoteAccepted,
    quoteExists,
    contractSigned,
    contractSent,
    depositPaid,
    sessionStepAgg,
  ]);

  async function setWorkflowStep(step: ProjectWorkflowStep) {
    setBusy("workflow");
    try {
      const result = await mutateJson(
        `/api/projects/${project.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workflowStep: step }),
        },
        { action: "update" },
      );
      if (!result.ok) {
        push(result.errorMessage, "danger");
        return;
      }
      push("Workflow updated", "success");
      await refresh();
    } finally {
      setBusy(null);
    }
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
    try {
      const result = await mutateJson<{
        url?: string;
        emailed?: boolean;
      }>(
        "/api/documents/questionnaires",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "send",
            projectId: project.id,
            templateId: sendTemplateId || undefined,
          }),
        },
        { action: "send" },
      );
      if (!result.ok) {
        push(result.errorMessage, "danger");
        return;
      }
      const data = result.data;
      if (data.url) {
        await navigator.clipboard.writeText(data.url).catch(() => undefined);
      }
      if (data.emailed === false) {
        push("Link copied", "success");
      } else {
        push("Questionnaire sent", "success");
        if (data.url) push("Link copied", "success");
      }
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  async function createSessionForQuote(e: FormEvent) {
    e.preventDefault();
    const type = inlineSessionType.trim();
    if (!type) {
      push("Session label required", "danger");
      return;
    }
    setBusy("pricing-session");
    try {
      const result = await mutateJson<{
        session?: ProjectSession;
        calendarSyncFailed?: boolean;
      }>(
        "/api/sessions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: project.id,
            type,
            startsAt: inlineSessionDate || undefined,
          }),
        },
        { action: "create" },
      );
      if (!result.ok) {
        push(result.errorMessage, "danger");
        return;
      }
      const session = result.data.session;
      if (session?.id) {
        setQuoteSessionId(session.id);
        setToolSessionId(session.id);
      }
      if (result.data.calendarSyncFailed) {
        push("Session created · calendar not updated", "danger");
      } else {
        push("Session created", "success");
      }
      setInlineSessionDate("");
      await refresh();
    } finally {
      setBusy(null);
    }
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
    const pkg = packages.find((p) => p.id === packageId);
    if (!pkg?.defaultPricing?.length) {
      push("Add package pricing first", "danger");
      return;
    }
    if (hasUnsetPricing(pkg.defaultPricing)) {
      const ok = await confirm(confirmUnsetPricing("create"));
      if (!ok) return;
    }
    if (proposal) {
      const ok = await confirm(confirmReplaceQuote());
      if (!ok) return;
    }
    setBusy("pricing");
    try {
      const result = await mutateJson(
        "/api/proposals",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: activeSessionId,
            packageTemplateId: packageId,
          }),
        },
        { action: "create" },
      );
      if (!result.ok) {
        push(result.errorMessage, "danger");
        return;
      }
      push(proposal ? "Quote replaced" : "Quote created", "success");
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  async function copyQuoteLink() {
    if (!proposal) return;
    if (
      proposal.status === "draft" &&
      hasUnsetPricing(proposal.tiers)
    ) {
      const ok = await confirm(confirmUnsetPricing("send"));
      if (!ok) return;
    }
    const url = absoluteUrl(`/p/${proposal.token}`);
    try {
      await navigator.clipboard.writeText(url);
      push("Link copied", "success");
      if (proposal.status === "draft") {
        const result = await mutateJson(
          `/api/proposals/${proposal.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "sent" }),
          },
          { action: "update" },
        );
        if (!result.ok) {
          push(result.errorMessage, "danger");
          return;
        }
        await refresh();
      }
    } catch {
      push("Could not copy", "danger");
    }
  }

  async function emailQuote() {
    if (!proposal || busy) return;
    if (hasUnsetPricing(proposal.tiers)) {
      const ok = await confirm(confirmUnsetPricing("send"));
      if (!ok) return;
    }
    setBusy("pricing");
    try {
      const result = await mutateJson<{ emailed?: boolean }>(
        `/api/proposals/${proposal.id}/email`,
        {
          method: "POST",
          headers: withIdempotencyHeaders(newIdempotencyKey()),
        },
        { action: "send" },
      );
      if (!result.ok) {
        push(result.errorMessage, "danger");
        return;
      }
      const toast = toastAfterEmailAttempt(
        result.data.emailed !== false,
        "Quote emailed",
        "Quote ready",
      );
      push(toast.message, toast.tone);
      await refresh();
    } finally {
      setBusy(null);
    }
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
    try {
      const result = await mutateJson(
        `/api/proposals/${proposal.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "accepted" }),
        },
        { action: "update" },
      );
      if (!result.ok) {
        push(result.errorMessage, "danger");
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
    } finally {
      setBusy(null);
    }
  }

  function contractPayload() {
    const tmpl = contractTemplates.find((t) => t.id === contractTemplateId);
    return {
      projectId: project.id,
      title: tmpl?.name || "Photography agreement",
      body: tmpl?.body || defaultContractBody(),
      templateId: contractTemplateId || undefined,
      cancelPolicy: tmpl?.cancelPolicy,
    };
  }

  async function previewContract() {
    if (busy) return;
    setBusy("contract-preview");
    try {
      const result = await mutateJson<{
        url?: string;
        contract?: { token?: string };
      }>(
        "/api/documents/contracts",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "preview", ...contractPayload() }),
        },
        { action: "open" },
      );
      if (!result.ok) {
        push(result.errorMessage, "danger");
        return;
      }
      const data = result.data;
      const token =
        data.contract?.token ||
        (typeof data.url === "string"
          ? data.url.match(/\/c\/([^/?#]+)/)?.[1]
          : null);
      if (token) {
        router.push(
          adminPreviewHref("c", token, `/admin/projects/${project.id}`),
        );
      }
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  async function sendContract() {
    if (busy) return;
    setBusy("contract");
    try {
      const result = await mutateJson<{ url?: string }>(
        "/api/documents/contracts",
        {
          method: "POST",
          headers: withIdempotencyHeaders(newIdempotencyKey(), {
            "Content-Type": "application/json",
          }),
          body: JSON.stringify(contractPayload()),
        },
        { action: "send" },
      );
      if (!result.ok) {
        push(result.errorMessage, "danger");
        return;
      }
      push("Contract sent", "success");
      if (result.data.url) {
        await navigator.clipboard
          .writeText(result.data.url)
          .catch(() => undefined);
        push("Sign link copied", "success");
      }
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  async function copyContractLink() {
    const c =
      contracts.find((x) => x.status === "awaiting_signature") ||
      contracts.find((x) => x.status === "completed");
    if (!c) return;
    try {
      await navigator.clipboard.writeText(absoluteUrl(`/c/${c.token}`));
      push("Sign link copied", "success");
    } catch {
      push("Could not copy", "danger");
    }
  }

  async function createDeposit() {
    setBusy("deposit");
    try {
      const result = await mutateJson<{
        payUrl?: string;
        checkoutUrl?: string;
      }>(
        `/api/projects/${project.id}/deposit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: depositAmount ? Number(depositAmount) : undefined,
          }),
        },
        { action: "create" },
      );
      if (!result.ok) {
        push(result.errorMessage, "danger");
        return;
      }
      const url = result.data.payUrl || result.data.checkoutUrl;
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
    } finally {
      setBusy(null);
    }
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
      push(PROJECT_EMAIL_REQUIRED, "danger");
      return;
    }
    setBusy("deposit");
    try {
      const result = await mutateJson<{ emailed?: boolean }>(
        "/api/payments/links",
        {
          method: "POST",
          headers: withIdempotencyHeaders(newIdempotencyKey(), {
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({
            action: "email",
            id: projectDepositLink.id,
            email: to,
          }),
        },
        { action: "send" },
      );
      if (!result.ok) {
        push(result.errorMessage, "danger");
        return;
      }
      const toast = toastAfterEmailAttempt(
        result.data.emailed !== false,
        "Pay link emailed",
        "Pay link ready",
      );
      push(toast.message, toast.tone);
    } finally {
      setBusy(null);
    }
  }

  async function createBalance() {
    setBusy("balance");
    try {
      const result = await mutateJson<{
        payUrl?: string;
        checkoutUrl?: string;
      }>(
        `/api/projects/${project.id}/balance`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: balanceAmount ? Number(balanceAmount) : undefined,
          }),
        },
        { action: "create" },
      );
      if (!result.ok) {
        push(result.errorMessage, "danger");
        return;
      }
      const url = result.data.payUrl || result.data.checkoutUrl;
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
    } finally {
      setBusy(null);
    }
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
      push(PROJECT_EMAIL_REQUIRED, "danger");
      return;
    }
    setBusy("balance");
    try {
      const result = await mutateJson<{ emailed?: boolean }>(
        "/api/payments/links",
        {
          method: "POST",
          headers: withIdempotencyHeaders(newIdempotencyKey(), {
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({
            action: "email",
            id: projectBalanceLink.id,
            email: to,
          }),
        },
        { action: "send" },
      );
      if (!result.ok) {
        push(result.errorMessage, "danger");
        return;
      }
      const toast = toastAfterEmailAttempt(
        result.data.emailed !== false,
        "Pay link emailed",
        "Pay link ready",
      );
      push(toast.message, toast.tone);
    } finally {
      setBusy(null);
    }
  }

  async function createGallery() {
    const session = toolSession || primarySession;
    if (!session) {
      push("Add a session first", "danger");
      return;
    }
    setBusy("delivery");
    const pin = String(Math.floor(1000 + Math.random() * 9000));
    try {
      const result = await mutateJson(
        "/api/galleries",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: session.id,
            title: `${project.name} gallery`,
            pin,
            goLive: false,
          }),
        },
        { action: "create" },
      );
      if (!result.ok) {
        push(result.errorMessage, "danger");
        return;
      }
      try {
        await navigator.clipboard.writeText(pin);
        push(`Gallery created · PIN ${pin} copied`, "success");
      } catch {
        push(`Gallery created · PIN ${pin}`, "success");
      }
      onChanged?.();
      window.location.href = `/admin/projects/${project.adminSlug || project.id}/sessions/${session.adminSlug || session.id}?step=delivery`;
    } finally {
      setBusy(null);
    }
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
    if (stepId === "prep" || stepId === "delivery") {
      const agg =
        stepId === "prep" ? sessionStepAgg.prep : sessionStepAgg.delivery;
      const multi = multiSessionBadgeLabel(
        state,
        isCurrent,
        agg.readyCount,
        agg.total,
      );
      if (multi) return multi;
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
    <section id="workflow" className="space-y-5 scroll-mt-[var(--admin-scroll-mt)]">
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
                      : `${awaitingCount} awaiting signature`}
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
                  sessions.length === 0 ? (
                    <form
                      onSubmit={(e) => void createSessionForQuote(e)}
                      className="grid max-w-xl gap-4 sm:grid-cols-2"
                    >
                      <Field className="sm:col-span-2">
                        <Label>Session label</Label>
                        <Input
                          value={inlineSessionType}
                          onChange={(e) =>
                            setInlineSessionType(e.target.value)
                          }
                          required
                        />
                      </Field>
                      <Field>
                        <Label>Date</Label>
                        <Input
                          type="date"
                          value={inlineSessionDate}
                          onChange={(e) =>
                            setInlineSessionDate(e.target.value)
                          }
                        />
                      </Field>
                      <div className="flex items-end">
                        <Button
                          type="submit"
                          tone="accent"
                          className="w-full min-h-11"
                          pending={busy === "pricing-session"}
                          pendingLabel="Adding…"
                        >
                          Add session
                        </Button>
                      </div>
                    </form>
                  ) : (
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
                  )
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
                        {
                          id: "preview",
                          label: "Preview",
                          tone: "ghost" as const,
                          pending: busy === "contract-preview",
                          pendingLabel: "Opening…",
                          onClick: () => void previewContract(),
                        },
                        ...(contracts.some(
                          (c) => c.status === "awaiting_signature",
                        )
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
