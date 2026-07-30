"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IntakeListEditor } from "@/components/admin/ListEditor";
import {
  Button,
  ButtonLink,
  Card,
  Checkbox,
  EmptyState,
  Field,
  Input,
  Label,
  PageHeader,
  Select,
  Tabs,
  Textarea,
  useToast,
} from "@/components/ui";
import { useUnsavedChangesGuard } from "@/lib/hooks/use-unsaved-changes";
import type {
  Contract,
  ContractTemplate,
  IntakeQuestion,
  QuestionnaireResponse,
  QuestionnaireTemplate,
} from "@/lib/types";
import { defaultContractBody } from "@/lib/contracts/defaults";

type DocTab = "contracts" | "questionnaires" | "templates";

function defaultQuestions(): IntakeQuestion[] {
  return [
    {
      id: crypto.randomUUID(),
      label: "Tell us about your session goals",
      type: "textarea",
      required: true,
    },
    {
      id: crypto.randomUUID(),
      label: "Preferred location",
      type: "text",
    },
  ];
}

function parseTab(raw: string | null): DocTab {
  if (raw === "questionnaires" || raw === "templates") return raw;
  return "contracts";
}

function AnswersList({
  questions,
  answers,
}: {
  questions: IntakeQuestion[];
  answers: Record<string, string>;
}) {
  if (!questions.length) {
    return <p className="text-sm text-muted">No questions.</p>;
  }
  return (
    <dl className="mt-3 space-y-3">
      {questions.map((q) => (
        <div key={q.id}>
          <dt className="text-xs uppercase tracking-[0.14em] text-muted">
            {q.label}
          </dt>
          <dd className="mt-1 whitespace-pre-wrap text-sm">
            {answers[q.id]?.trim() || "—"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function DocumentsPageInner() {
  const { push } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseTab(searchParams.get("tab"));

  const [contracts, setContracts] = useState<Omit<Contract, "body">[]>([]);
  const [contractTemplates, setContractTemplates] = useState<ContractTemplate[]>(
    [],
  );
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [templates, setTemplates] = useState<QuestionnaireTemplate[]>([]);
  const [responses, setResponses] = useState<QuestionnaireResponse[]>([]);
  const [packageNames, setPackageNames] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [tmplName, setTmplName] = useState("Photography agreement");
  const [tmplBody, setTmplBody] = useState(() => defaultContractBody());
  const [tmplUntilPayment, setTmplUntilPayment] = useState(true);
  const [tmplDaysBefore, setTmplDaysBefore] = useState("7");
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [qName, setQName] = useState("Session questionnaire");
  const [qQuestions, setQQuestions] = useState<IntakeQuestion[]>(defaultQuestions);
  const [editingQId, setEditingQId] = useState<string | null>(null);
  const [qBusy, setQBusy] = useState(false);
  const [expandedResponseId, setExpandedResponseId] = useState<string | null>(
    null,
  );
  const [contractsHasMore, setContractsHasMore] = useState(false);
  const [responsesHasMore, setResponsesHasMore] = useState(false);
  const [contractsLoadingMore, setContractsLoadingMore] = useState(false);
  const [responsesLoadingMore, setResponsesLoadingMore] = useState(false);

  function cancelPolicyPayload(until: boolean, days: string) {
    return {
      untilPayment: until,
      daysBeforeSession: days.trim() === "" ? null : Number(days),
    };
  }

  const [loading, setLoading] = useState(true);
  const [docDirty, setDocDirty] = useState(false);
  useUnsavedChangesGuard(docDirty);

  function setTab(next: string) {
    const id = parseTab(next);
    router.replace(`/admin/documents?tab=${id}`, { scroll: false });
  }

  async function load() {
    const [docs, projs, qs] = await Promise.all([
      fetch("/api/documents/contracts"),
      fetch("/api/projects?options=1"),
      fetch("/api/documents/questionnaires"),
    ]);
    setLoading(false);
    if (docs.ok) {
      const d = await docs.json();
      setContracts(d.contracts || []);
      setContractsHasMore(Boolean(d.hasMore));
      setContractTemplates((d.templates || []) as ContractTemplate[]);
    }
    if (projs.ok) {
      const p = await projs.json();
      setProjects(p.projects || []);
    }
    if (qs.ok) {
      const q = await qs.json();
      setTemplates(q.templates || []);
      setResponses(q.responses || []);
      setResponsesHasMore(Boolean(q.hasMore));
      setPackageNames(q.packageTemplates || []);
    }
  }

  function projectName(id: string) {
    return projects.find((p) => p.id === id)?.name || "Project";
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Legacy hashes from Settings Library → tab query.
  useEffect(() => {
    if (loading) return;
    const hash = window.location.hash.replace(/^#/, "");
    if (hash === "contract-templates") {
      router.replace("/admin/documents?tab=templates", { scroll: false });
      return;
    }
    if (hash === "questionnaires") {
      router.replace("/admin/documents?tab=questionnaires", { scroll: false });
    }
  }, [loading, router]);

  async function saveContractTemplate(e: FormEvent) {
    e.preventDefault();
    const payload = {
      name: tmplName,
      body: tmplBody,
      cancelPolicy: cancelPolicyPayload(tmplUntilPayment, tmplDaysBefore),
    };
    const res = await fetch("/api/documents/contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        editingTemplateId
          ? {
              action: "update_template",
              templateId: editingTemplateId,
              ...payload,
            }
          : { action: "create_template", ...payload },
      ),
    });
    const data = await res.json();
    if (!res.ok) {
      push(data.error || "Failed", "danger");
      return;
    }
    setDocDirty(false);
    push(
      editingTemplateId ? "Template updated" : "Contract template created",
      "success",
    );
    setEditingTemplateId(null);
    void load();
  }

  function startEditTemplate(t: ContractTemplate) {
    setEditingTemplateId(t.id);
    setTmplName(t.name);
    setTmplBody(t.body);
    setTmplUntilPayment(Boolean(t.cancelPolicy?.untilPayment));
    setTmplDaysBefore(
      t.cancelPolicy?.daysBeforeSession != null
        ? String(t.cancelPolicy.daysBeforeSession)
        : "",
    );
    setTab("templates");
  }

  async function saveQTemplate(e: FormEvent) {
    e.preventDefault();
    setQBusy(true);
    const res = await fetch("/api/documents/questionnaires", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        editingQId
          ? {
              action: "update_template",
              templateId: editingQId,
              name: qName,
              questions: qQuestions,
            }
          : {
              action: "create_template",
              name: qName,
              questions: qQuestions,
            },
      ),
    });
    setQBusy(false);
    if (!res.ok) {
      push("Could not save template", "danger");
      return;
    }
    setDocDirty(false);
    push(editingQId ? "Template updated" : "Questionnaire template created", "success");
    setEditingQId(null);
    setQName("Session questionnaire");
    setQQuestions(defaultQuestions());
    void load();
  }

  function startEditQTemplate(t: QuestionnaireTemplate) {
    setEditingQId(t.id);
    setQName(t.name);
    setQQuestions(
      t.questions.length
        ? t.questions.map((q) => ({ ...q }))
        : defaultQuestions(),
    );
    setTab("templates");
  }

  function cancelEditQTemplate() {
    setEditingQId(null);
    setQName("Session questionnaire");
    setQQuestions(defaultQuestions());
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        actions={
          <ButtonLink
            href="/admin/settings/library"
            tone="ghost"
            className="min-h-11"
          >
            Library
          </ButtonLink>
        }
      />

      <Tabs
        tabs={[
          { id: "contracts", label: "Contracts" },
          { id: "questionnaires", label: "Questionnaires" },
          { id: "templates", label: "Templates" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "contracts" ? (
        <div className="space-y-6">
          <p className="text-sm text-muted">
            Send contracts from a project. This list is your sent inventory.
          </p>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/admin/projects" className="min-h-11">
              Open projects
            </ButtonLink>
            <Button
              type="button"
              tone="ghost"
              className="min-h-11"
              onClick={() => setTab("templates")}
            >
              Contract templates
            </Button>
          </div>
          <section className="space-y-4">
            <h2 className="font-display text-2xl">Sent contracts</h2>
            <ul className="space-y-3 sm:space-y-0 sm:divide-y sm:divide-line sm:border-y sm:border-line">
              {loading ? (
                <li className="py-4 text-sm text-muted">Loading documents…</li>
              ) : contracts.length === 0 ? (
                <li className="py-4 text-sm text-muted">No contracts yet.</li>
              ) : (
                contracts.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-col gap-3 border border-line p-4 sm:flex-row sm:flex-wrap sm:justify-between sm:border-0 sm:p-0 sm:py-4"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{c.title}</p>
                      <p className="text-sm text-muted">
                        {projectName(c.projectId)}
                        {" · "}
                        {c.status.replaceAll("_", " ")}
                        {c.cancelPolicy?.untilPayment ? " · until payment" : ""}
                        {c.cancelPolicy?.daysBeforeSession != null
                          ? ` · ${c.cancelPolicy.daysBeforeSession}d before`
                          : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <a
                        className="inline-flex min-h-11 items-center text-sm text-accent no-underline"
                        href={`/admin/projects/${c.projectId}#workflow`}
                      >
                        Project
                      </a>
                      <a
                        className="inline-flex min-h-11 items-center text-sm text-muted no-underline hover:text-ink"
                        href={`/c/${c.token}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Preview
                      </a>
                    </div>
                  </li>
                ))
              )}
            </ul>
            {contractsHasMore ? (
              <Button
                type="button"
                tone="neutral"
                className="min-h-11 w-full sm:w-auto"
                pending={contractsLoadingMore}
                pendingLabel="Loading…"
                onClick={async () => {
                  setContractsLoadingMore(true);
                  const res = await fetch(
                    `/api/documents/contracts?offset=${contracts.length}`,
                  );
                  setContractsLoadingMore(false);
                  if (!res.ok) {
                    push("Could not load contracts", "danger");
                    return;
                  }
                  const d = await res.json();
                  setContracts((prev) => [...prev, ...(d.contracts || [])]);
                  setContractsHasMore(Boolean(d.hasMore));
                }}
              >
                Load more
              </Button>
            ) : null}
          </section>
        </div>
      ) : null}

      {tab === "questionnaires" ? (
        <div className="space-y-6">
          <p className="text-sm text-muted">
            Send questionnaires from a project. Responses land here.
          </p>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/admin/projects" className="min-h-11">
              Open projects
            </ButtonLink>
            <Button
              type="button"
              tone="ghost"
              className="min-h-11"
              onClick={() => setTab("templates")}
            >
              Questionnaire templates
            </Button>
          </div>
          <section className="space-y-4">
            <h2 className="font-display text-2xl">Responses</h2>
            <ul className="space-y-3 sm:space-y-0 sm:divide-y sm:divide-line sm:border-y sm:border-line">
              {loading ? (
                <li className="py-4 text-sm text-muted">Loading…</li>
              ) : responses.length === 0 ? (
                <li className="py-4 text-sm text-muted">None yet.</li>
              ) : (
                responses.map((r) => {
                  const open = expandedResponseId === r.id;
                  return (
                    <li
                      key={r.id}
                      className="border border-line p-4 sm:border-0 sm:p-0 sm:py-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="font-medium">{r.title}</p>
                          <p className="text-sm text-muted">
                            {projectName(r.projectId)}
                            {" · "}
                            {r.submittedAt
                              ? `Submitted ${new Date(r.submittedAt).toLocaleString()}`
                              : "Awaiting answers"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <a
                            className="inline-flex min-h-11 items-center text-sm text-accent no-underline"
                            href={`/admin/projects/${r.projectId}#workflow`}
                          >
                            Project
                          </a>
                          {r.submittedAt ? (
                            <Button
                              type="button"
                              size="sm"
                              tone="neutral"
                              className="min-h-11"
                              onClick={() =>
                                setExpandedResponseId(open ? null : r.id)
                              }
                            >
                              {open ? "Hide answers" : "View answers"}
                            </Button>
                          ) : null}
                          <a
                            className="inline-flex min-h-11 items-center text-sm text-muted no-underline hover:text-ink"
                            href={`/q/${r.token}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Preview
                          </a>
                        </div>
                      </div>
                      {open && r.submittedAt ? (
                        <AnswersList
                          questions={r.questions}
                          answers={r.answers || {}}
                        />
                      ) : null}
                    </li>
                  );
                })
              )}
            </ul>
            {responsesHasMore ? (
              <Button
                type="button"
                tone="neutral"
                className="min-h-11 w-full sm:w-auto"
                pending={responsesLoadingMore}
                pendingLabel="Loading…"
                onClick={async () => {
                  setResponsesLoadingMore(true);
                  const res = await fetch(
                    `/api/documents/questionnaires?offset=${responses.length}`,
                  );
                  setResponsesLoadingMore(false);
                  if (!res.ok) {
                    push("Could not load responses", "danger");
                    return;
                  }
                  const q = await res.json();
                  setResponses((prev) => [...prev, ...(q.responses || [])]);
                  setResponsesHasMore(Boolean(q.hasMore));
                }}
              >
                Load more
              </Button>
            ) : null}
          </section>
        </div>
      ) : null}

      {tab === "templates" ? (
        <div className="space-y-10">
          <Card className="p-5">
            <h2 className="mb-4 font-display text-2xl">
              {editingTemplateId ? "Edit contract template" : "Contract template"}
            </h2>
            <form onSubmit={saveContractTemplate} className="max-w-2xl space-y-4">
              <Field>
                <Label htmlFor="tmpl-name">Name</Label>
                <Input
                  id="tmpl-name"
                  value={tmplName}
                  onChange={(e) => {
                    setTmplName(e.target.value);
                    setDocDirty(true);
                  }}
                  required
                />
              </Field>
              <Field>
                <Label htmlFor="tmpl-body">Body</Label>
                <Textarea
                  id="tmpl-body"
                  value={tmplBody}
                  onChange={(e) => {
                    setTmplBody(e.target.value);
                    setDocDirty(true);
                  }}
                  rows={14}
                  required
                />
                {!editingTemplateId ? (
                  <Button
                    type="button"
                    tone="ghost"
                    size="sm"
                    onClick={() => setTmplBody(defaultContractBody())}
                  >
                    Reset to standard clauses
                  </Button>
                ) : null}
              </Field>
              <fieldset className="space-y-3 border border-line p-4">
                <legend className="px-1 text-sm font-medium">Cancel policy</legend>
                <label className="flex min-h-11 items-center gap-3 text-sm">
                  <Checkbox
                    checked={tmplUntilPayment}
                    onChange={(e) => setTmplUntilPayment(e.target.checked)}
                  />
                  Until payment received
                </label>
                <Field>
                  <Label htmlFor="tmpl-days">Days before session</Label>
                  <Input
                    id="tmpl-days"
                    type="number"
                    min={0}
                    value={tmplDaysBefore}
                    onChange={(e) => setTmplDaysBefore(e.target.value)}
                    placeholder="Optional"
                  />
                </Field>
              </fieldset>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="submit" className="min-h-11">
                  {editingTemplateId ? "Save template" : "Create template"}
                </Button>
                {editingTemplateId ? (
                  <Button
                    type="button"
                    tone="ghost"
                    className="min-h-11"
                    onClick={() => setEditingTemplateId(null)}
                  >
                    Cancel edit
                  </Button>
                ) : null}
              </div>
            </form>
            {contractTemplates.length > 0 ? (
              <ul className="mt-6 space-y-3 border-t border-line pt-4">
                {contractTemplates.map((t) => (
                  <li
                    key={t.id}
                    className="flex flex-col gap-2 border border-line p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{t.name}</p>
                      <p className="text-sm text-muted">
                        {t.cancelPolicy?.untilPayment
                          ? "Until payment"
                          : "No payment gate"}
                        {t.cancelPolicy?.daysBeforeSession != null
                          ? ` · ${t.cancelPolicy.daysBeforeSession}d before session`
                          : ""}
                      </p>
                    </div>
                    <Button
                      type="button"
                      tone="ghost"
                      className="min-h-11 w-full sm:w-auto"
                      onClick={() => startEditTemplate(t)}
                    >
                      Edit
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 font-display text-2xl">
              {editingQId ? "Edit questionnaire template" : "Questionnaire template"}
            </h2>
            <form onSubmit={saveQTemplate} className="max-w-2xl space-y-3">
              <Field>
                <Label htmlFor="qname">Name</Label>
                <Input
                  id="qname"
                  value={qName}
                  onChange={(e) => {
                    setQName(e.target.value);
                    setDocDirty(true);
                  }}
                />
              </Field>
              <IntakeListEditor
                label="Questions"
                questions={qQuestions}
                onChange={(next) => {
                  setQQuestions(next);
                  setDocDirty(true);
                }}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  tone="neutral"
                  className="min-h-11"
                  pending={qBusy}
                  pendingLabel="Saving…"
                >
                  {editingQId ? "Save template" : "Create template"}
                </Button>
                {editingQId ? (
                  <Button
                    type="button"
                    tone="ghost"
                    className="min-h-11"
                    onClick={cancelEditQTemplate}
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
            </form>
            {templates.length > 0 ? (
              <ul className="mt-6 space-y-2 border-t border-line pt-4 text-sm">
                {templates.map((t) => (
                  <li
                    key={t.id}
                    className="flex flex-wrap items-center justify-between gap-2"
                  >
                    <span>
                      {t.name}
                      <span className="text-muted">
                        {" "}
                        · {t.questions.length} questions
                      </span>
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      tone="ghost"
                      className="min-h-11"
                      onClick={() => startEditQTemplate(t)}
                    >
                      Edit
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>

          {packageNames.length > 0 ? (
            <section className="space-y-3">
              <h2 className="font-display text-2xl">Quote packages</h2>
              <ul className="space-y-3 sm:divide-y sm:divide-line sm:border-y sm:border-line">
                {packageNames.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-col gap-1 border border-line p-4 sm:flex-row sm:justify-between sm:gap-3 sm:border-0 sm:p-0 sm:py-3"
                  >
                    <span className="text-sm">{p.name}</span>
                    <a
                      className="inline-flex min-h-11 items-center text-sm text-accent no-underline"
                      href="/admin/prep?tab=packages"
                    >
                      Edit in Library
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <Suspense
      fallback={<EmptyState variant="loading" title="Loading documents…" />}
    >
      <DocumentsPageInner />
    </Suspense>
  );
}
