"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Field,
  Label,
  Select,
  useToast,
} from "@/components/ui";
import type {
  Contract,
  Invoice,
  Project,
  ProjectSession,
  ProjectWorkflowStep,
  QuestionnaireResponse,
} from "@/lib/types";

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

type SessionHint = Pick<ProjectSession, "id" | "type" | "status"> & {
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
  const [questionnaires, setQuestionnaires] = useState<QuestionnaireResponse[]>(
    [],
  );
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [qTemplates, setQTemplates] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [sendTemplateId, setSendTemplateId] = useState("");
  const [showAnswers, setShowAnswers] = useState(false);

  const primarySession = sessions[0];
  const current = project.workflowStep || "inquiry";
  const currentIdx = stepIndex(current);
  const latestSubmitted = useMemo(
    () => questionnaires.find((r) => Boolean(r.submittedAt)),
    [questionnaires],
  );

  async function loadRelated() {
    const [qs, docs, pay] = await Promise.all([
      fetch("/api/documents/questionnaires"),
      fetch("/api/documents/contracts"),
      fetch("/api/payments/links"),
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
    }
    if (pay.ok) {
      const data = await pay.json();
      const all = (data.invoices || []) as Invoice[];
      setInvoices(all.filter((i) => i.projectId === project.id));
    }
  }

  useEffect(() => {
    void loadRelated();
  }, [project.id]);

  const qDone = questionnaires.some((r) => Boolean(r.submittedAt));
  const qSent = questionnaires.length > 0;
  const contractSigned = contracts.some((c) => c.status === "completed");
  const contractSent = contracts.length > 0;
  const depositPaid =
    (project.paidAmount || 0) > 0 ||
    invoices.some((i) => i.status === "paid");
  const prepHref = primarySession
    ? `/admin/projects/${project.id}/sessions/${primarySession.id}?step=prep`
    : undefined;
  const pricingHref = primarySession
    ? `/admin/projects/${project.id}/sessions/${primarySession.id}?step=proposal`
    : undefined;
  const deliveryHref = primarySession
    ? `/admin/projects/${project.id}/sessions/${primarySession.id}?step=delivery`
    : undefined;

  const statusByStep = useMemo(() => {
    return {
      inquiry: "done" as const,
      questionnaire: qDone ? "done" : qSent ? "active" : "todo",
      pricing: currentIdx > stepIndex("pricing") ? "done" : "todo",
      contract: contractSigned ? "done" : contractSent ? "active" : "todo",
      deposit: depositPaid ? "done" : "todo",
      prep:
        primarySession?.currentStep === "shoot-day" ||
        primarySession?.currentStep === "delivery" ||
        primarySession?.currentStep === "wrap"
          ? "done"
          : "todo",
      delivery:
        primarySession?.status === "delivered" ||
        primarySession?.status === "archived" ||
        Boolean(primarySession?.galleryToken)
          ? "done"
          : "todo",
    } satisfies Record<ProjectWorkflowStep, "done" | "active" | "todo">;
  }, [
    qDone,
    qSent,
    currentIdx,
    contractSigned,
    contractSent,
    depositPaid,
    primarySession,
  ]);

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
    void loadRelated();
    onChanged?.();
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
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      push(String(data.error || "Could not create deposit"), "danger");
      return;
    }
    const url = data.checkoutUrl as string | undefined;
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
    void loadRelated();
    onChanged?.();
  }

  async function createGallery() {
    if (!primarySession) {
      push("Add a session first", "danger");
      return;
    }
    setBusy("delivery");
    const pin = String(Math.floor(1000 + Math.random() * 9000));
    const res = await fetch("/api/galleries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shootId: primarySession.id,
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
    push("Gallery draft created — open delivery to upload", "success");
    onChanged?.();
    if (deliveryHref) {
      window.location.href = deliveryHref;
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

  function badgeLabel(state: "done" | "active" | "todo", isCurrent: boolean) {
    if (state === "done") return "Done";
    if (isCurrent) return "Current";
    if (state === "active") return "In progress";
    return "Next";
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
              <div className="min-w-0 space-y-1">
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
                  </p>
                ) : null}
              </div>

              <div className="mt-3 flex flex-col gap-2 sm:mt-0 sm:items-end">
                {step.id === "questionnaire" ? (
                  <>
                    {qTemplates.length > 0 ? (
                      <Field className="w-full sm:w-56">
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
                      className="min-h-11 w-full sm:w-auto"
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
                        className="min-h-11 w-full sm:w-auto"
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

                {step.id === "pricing" && pricingHref ? (
                  <Link href={pricingHref}>
                    <Button className="min-h-11 w-full sm:w-auto">
                      Open quote
                    </Button>
                  </Link>
                ) : null}

                {step.id === "contract" ? (
                  <Link href="/admin/documents">
                    <Button className="min-h-11 w-full sm:w-auto" tone="neutral">
                      Documents
                    </Button>
                  </Link>
                ) : null}

                {step.id === "deposit" ? (
                  <div className="flex w-full flex-col gap-2 sm:items-end">
                    <Button
                      className="min-h-11 w-full sm:w-auto"
                      disabled={busy === "deposit" || depositPaid}
                      onClick={() => void createDeposit()}
                    >
                      Create deposit
                    </Button>
                    <Link href="/admin/payments">
                      <Button
                        className="min-h-11 w-full sm:w-auto"
                        tone="ghost"
                      >
                        Payments
                      </Button>
                    </Link>
                  </div>
                ) : null}

                {step.id === "prep" && prepHref ? (
                  <Link href={prepHref}>
                    <Button className="min-h-11 w-full sm:w-auto">
                      Open prep
                    </Button>
                  </Link>
                ) : null}

                {step.id === "delivery" ? (
                  <div className="flex w-full flex-col gap-2 sm:items-end">
                    {deliveryHref ? (
                      <Link href={deliveryHref}>
                        <Button className="min-h-11 w-full sm:w-auto">
                          Open delivery
                        </Button>
                      </Link>
                    ) : null}
                    {!primarySession?.galleryToken ? (
                      <Button
                        className="min-h-11 w-full sm:w-auto"
                        tone="neutral"
                        disabled={busy === "delivery" || !primarySession}
                        onClick={() => void createGallery()}
                      >
                        Create gallery
                      </Button>
                    ) : primarySession.galleryToken ? (
                      <a
                        className="text-sm text-accent"
                        href={`/g/${primarySession.galleryToken}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open gallery
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
