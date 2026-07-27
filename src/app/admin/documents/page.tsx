"use client";

import { FormEvent, useEffect, useState } from "react";
import { IntakeListEditor } from "@/components/admin/ListEditor";
import {
  Button,
  Card,
  Checkbox,
  Field,
  Input,
  Label,
  PageHeader,
  Select,
  Textarea,
  useToast,
} from "@/components/ui";
import type {
  Contract,
  ContractTemplate,
  IntakeQuestion,
  Project,
  QuestionnaireResponse,
  QuestionnaireTemplate,
} from "@/lib/types";
import { defaultContractBody } from "@/lib/contracts/defaults";

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

export default function DocumentsPage() {
  const { push } = useToast();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [contractTemplates, setContractTemplates] = useState<ContractTemplate[]>(
    [],
  );
  const [projects, setProjects] = useState<Project[]>([]);
  const [templates, setTemplates] = useState<QuestionnaireTemplate[]>([]);
  const [responses, setResponses] = useState<QuestionnaireResponse[]>([]);
  const [packageNames, setPackageNames] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("Photography agreement");
  const [body, setBody] = useState(() => defaultContractBody());
  const [untilPayment, setUntilPayment] = useState(true);
  const [daysBeforeSession, setDaysBeforeSession] = useState("7");
  const [contractTemplateId, setContractTemplateId] = useState("");
  const [tmplName, setTmplName] = useState("Photography agreement");
  const [tmplBody, setTmplBody] = useState(() => defaultContractBody());
  const [tmplUntilPayment, setTmplUntilPayment] = useState(true);
  const [tmplDaysBefore, setTmplDaysBefore] = useState("7");
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [qTemplateId, setQTemplateId] = useState("");
  const [qName, setQName] = useState("Session questionnaire");
  const [qQuestions, setQQuestions] = useState<IntakeQuestion[]>(defaultQuestions);
  const [editingQId, setEditingQId] = useState<string | null>(null);
  const [qBusy, setQBusy] = useState(false);
  const [expandedResponseId, setExpandedResponseId] = useState<string | null>(
    null,
  );

  function cancelPolicyPayload(until: boolean, days: string) {
    return {
      untilPayment: until,
      daysBeforeSession: days.trim() === "" ? null : Number(days),
    };
  }

  async function load() {
    const [docs, projs, qs] = await Promise.all([
      fetch("/api/documents/contracts"),
      fetch("/api/clients"),
      fetch("/api/documents/questionnaires"),
    ]);
    if (docs.ok) {
      const d = await docs.json();
      setContracts(d.contracts || []);
      const tmpls = (d.templates || []) as ContractTemplate[];
      setContractTemplates(tmpls);
      if (!contractTemplateId && tmpls[0]) setContractTemplateId(tmpls[0].id);
    }
    if (projs.ok) {
      const p = await projs.json();
      const list = p.projects || p.clients || [];
      setProjects(list);
      if (!projectId && list[0]) setProjectId(list[0].id);
    }
    if (qs.ok) {
      const q = await qs.json();
      setTemplates(q.templates || []);
      setResponses(q.responses || []);
      setPackageNames(q.packageTemplates || []);
      if (!qTemplateId && q.templates?.[0]) setQTemplateId(q.templates[0].id);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function applyContractTemplate(id: string) {
    setContractTemplateId(id);
    const t = contractTemplates.find((x) => x.id === id);
    if (!t) return;
    setTitle(t.name);
    setBody(t.body);
    setUntilPayment(Boolean(t.cancelPolicy?.untilPayment));
    setDaysBeforeSession(
      t.cancelPolicy?.daysBeforeSession != null
        ? String(t.cancelPolicy.daysBeforeSession)
        : "",
    );
  }

  async function onCreateContract(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/documents/contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        title,
        body,
        templateId: contractTemplateId || undefined,
        cancelPolicy: cancelPolicyPayload(untilPayment, daysBeforeSession),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      push(data.error || "Failed", "danger");
      return;
    }
    push("Contract sent for signature", "success");
    if (data.url) {
      await navigator.clipboard.writeText(data.url).catch(() => undefined);
      push("Sign link copied", "success");
    }
    void load();
  }

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
  }

  function cancelEditQTemplate() {
    setEditingQId(null);
    setQName("Session questionnaire");
    setQQuestions(defaultQuestions());
  }

  async function sendQuestionnaire(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/documents/questionnaires", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "send",
        projectId,
        templateId: qTemplateId || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      push(data.error || "Failed", "danger");
      return;
    }
    push("Questionnaire sent", "success");
    if (data.url) {
      await navigator.clipboard.writeText(data.url).catch(() => undefined);
      push("Link copied", "success");
    }
    void load();
  }

  return (
    <div className="space-y-10">
      <PageHeader
        title="Documents"
        description="Contracts, questionnaires, and templates."
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 font-display text-2xl">New contract</h2>
          <form onSubmit={onCreateContract} className="space-y-4">
            <Field>
              <Label htmlFor="project">Project</Label>
              <Select
                id="project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                required
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            {contractTemplates.length > 0 ? (
              <Field>
                <Label htmlFor="ctmpl">From template</Label>
                <Select
                  id="ctmpl"
                  value={contractTemplateId}
                  onChange={(e) => applyContractTemplate(e.target.value)}
                >
                  <option value="">Custom</option>
                  {contractTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}
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
              <Label htmlFor="body">Contract body</Label>
              <Textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={12}
                required
              />
              <Button
                type="button"
                tone="ghost"
                size="sm"
                onClick={() => setBody(defaultContractBody())}
              >
                Reset to standard clauses
              </Button>
            </Field>
            <fieldset className="space-y-3 border border-line p-4">
              <legend className="px-1 text-sm font-medium">Cancel policy</legend>
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <Checkbox
                  checked={untilPayment}
                  onChange={(e) => setUntilPayment(e.target.checked)}
                />
                Until payment received
              </label>
              <Field>
                <Label htmlFor="days-before">Days before session</Label>
                <Input
                  id="days-before"
                  type="number"
                  min={0}
                  value={daysBeforeSession}
                  onChange={(e) => setDaysBeforeSession(e.target.value)}
                  placeholder="Optional"
                />
              </Field>
            </fieldset>
            <Button type="submit" className="min-h-11 w-full sm:w-auto">
              Send for signature
            </Button>
          </form>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-display text-2xl">Questionnaire</h2>
          <form onSubmit={saveQTemplate} className="mb-6 space-y-3">
            <Field>
              <Label htmlFor="qname">
                {editingQId ? "Edit template" : "New template"}
              </Label>
              <Input
                id="qname"
                value={qName}
                onChange={(e) => setQName(e.target.value)}
              />
            </Field>
            <IntakeListEditor
              label="Questions"
              questions={qQuestions}
              onChange={setQQuestions}
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
            <ul className="mb-6 space-y-2 border-y border-line py-3 text-sm">
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
                    onClick={() => startEditQTemplate(t)}
                  >
                    Edit
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
          <form onSubmit={sendQuestionnaire} className="space-y-3">
            <Field>
              <Label htmlFor="qproj">Send to project</Label>
              <Select
                id="qproj"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                required
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              <Label htmlFor="qtmpl">Template</Label>
              <Select
                id="qtmpl"
                value={qTemplateId}
                onChange={(e) => setQTemplateId(e.target.value)}
              >
                {templates.length === 0 ? (
                  <option value="">Default (auto-created)</option>
                ) : (
                  templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))
                )}
              </Select>
            </Field>
            <Button type="submit" className="min-h-11 w-full sm:w-auto">
              Send questionnaire
            </Button>
          </form>
        </Card>
      </div>

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
              onChange={(e) => setTmplName(e.target.value)}
              required
            />
          </Field>
          <Field>
            <Label htmlFor="tmpl-body">Body</Label>
            <Textarea
              id="tmpl-body"
              value={tmplBody}
              onChange={(e) => setTmplBody(e.target.value)}
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
                    {t.cancelPolicy?.untilPayment ? "Until payment" : "No payment gate"}
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

      <section>
        <h2 className="mb-3 font-display text-2xl">Templates hub</h2>
        <ul className="space-y-3 sm:space-y-0 sm:divide-y sm:divide-line sm:border-y sm:border-line text-sm">
          {contractTemplates.map((t) => (
            <li
              key={`c-${t.id}`}
              className="flex flex-col gap-1 border border-line p-4 sm:flex-row sm:justify-between sm:gap-3 sm:border-0 sm:p-0 sm:py-3"
            >
              <span>Contract · {t.name}</span>
              <span className="text-muted">Cancel policy set</span>
            </li>
          ))}
          {templates.map((t) => (
            <li
              key={t.id}
              className="flex flex-col gap-1 border border-line p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:border-0 sm:p-0 sm:py-3"
            >
              <span>
                Questionnaire · {t.name}
                <span className="text-muted"> · {t.questions.length} questions</span>
              </span>
              <Button
                type="button"
                size="sm"
                tone="ghost"
                onClick={() => startEditQTemplate(t)}
              >
                Edit
              </Button>
            </li>
          ))}
          {packageNames.map((p) => (
            <li
              key={p.id}
              className="flex flex-col gap-1 border border-line p-4 sm:flex-row sm:justify-between sm:gap-3 sm:border-0 sm:p-0 sm:py-3"
            >
              <span>Quote package · {p.name}</span>
              <a className="text-accent" href="/admin/prep">
                Edit in Prep
              </a>
            </li>
          ))}
          {templates.length === 0 &&
          packageNames.length === 0 &&
          contractTemplates.length === 0 ? (
            <li className="py-4 text-muted">
              Create a questionnaire template or package to populate the hub.
            </li>
          ) : null}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 font-display text-2xl">Contracts</h2>
        <ul className="space-y-3 sm:space-y-0 sm:divide-y sm:divide-line sm:border-y sm:border-line">
          {contracts.length === 0 ? (
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
                    {c.status.replaceAll("_", " ")}
                    {c.cancelPolicy?.untilPayment ? " · until payment" : ""}
                    {c.cancelPolicy?.daysBeforeSession != null
                      ? ` · ${c.cancelPolicy.daysBeforeSession}d before`
                      : ""}
                  </p>
                </div>
                <a
                  className="inline-flex min-h-11 items-center text-sm text-accent"
                  href={`/c/${c.token}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open
                </a>
              </li>
            ))
          )}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 font-display text-2xl">Questionnaire responses</h2>
        <ul className="space-y-3 sm:space-y-0 sm:divide-y sm:divide-line sm:border-y sm:border-line">
          {responses.length === 0 ? (
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
                        {r.submittedAt
                          ? `Submitted ${new Date(r.submittedAt).toLocaleString()}`
                          : "Awaiting answers"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {r.submittedAt ? (
                        <Button
                          type="button"
                          size="sm"
                          tone="neutral"
                          onClick={() =>
                            setExpandedResponseId(open ? null : r.id)
                          }
                        >
                          {open ? "Hide answers" : "View answers"}
                        </Button>
                      ) : null}
                      <a
                        className="inline-flex min-h-11 items-center text-sm text-accent"
                        href={`/q/${r.token}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Client link
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
      </section>
    </div>
  );
}
