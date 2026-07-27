"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Button,
  Card,
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
  Project,
  QuestionnaireResponse,
  QuestionnaireTemplate,
} from "@/lib/types";

export default function DocumentsPage() {
  const { push } = useToast();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [templates, setTemplates] = useState<QuestionnaireTemplate[]>([]);
  const [responses, setResponses] = useState<QuestionnaireResponse[]>([]);
  const [packageNames, setPackageNames] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("Photography agreement");
  const [body, setBody] = useState(
    "This agreement covers photography services, usage rights, and payment terms as discussed.",
  );
  const [qTemplateId, setQTemplateId] = useState("");
  const [qName, setQName] = useState("Session questionnaire");

  async function load() {
    const [docs, projs, qs] = await Promise.all([
      fetch("/api/documents/contracts"),
      fetch("/api/clients"),
      fetch("/api/documents/questionnaires"),
    ]);
    if (docs.ok) {
      const d = await docs.json();
      setContracts(d.contracts || []);
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

  async function onCreateContract(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/documents/contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, title, body }),
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

  async function createQTemplate(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/documents/questionnaires", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_template", name: qName }),
    });
    if (!res.ok) {
      push("Could not create template", "danger");
      return;
    }
    push("Questionnaire template created", "success");
    void load();
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
        description="Contracts, questionnaires, and templates — free for every studio."
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
                rows={8}
                required
              />
            </Field>
            <Button type="submit">Send for signature</Button>
          </form>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-display text-2xl">Questionnaire</h2>
          <form onSubmit={createQTemplate} className="mb-6 space-y-3">
            <Field>
              <Label htmlFor="qname">New template name</Label>
              <Input
                id="qname"
                value={qName}
                onChange={(e) => setQName(e.target.value)}
              />
            </Field>
            <Button type="submit" tone="neutral">
              Create template
            </Button>
          </form>
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
            <Button type="submit">Send questionnaire</Button>
          </form>
        </Card>
      </div>

      <section>
        <h2 className="mb-3 font-display text-2xl">Templates hub</h2>
        <ul className="divide-y divide-line border-y border-line text-sm">
          {templates.map((t) => (
            <li key={t.id} className="flex justify-between gap-3 py-3">
              <span>Questionnaire · {t.name}</span>
              <span className="text-muted">{t.questions.length} questions</span>
            </li>
          ))}
          {packageNames.map((p) => (
            <li key={p.id} className="flex justify-between gap-3 py-3">
              <span>Quote package · {p.name}</span>
              <a className="text-accent" href="/admin/prep">
                Edit in Prep
              </a>
            </li>
          ))}
          {templates.length === 0 && packageNames.length === 0 ? (
            <li className="py-4 text-muted">
              Create a questionnaire template or package to populate the hub.
            </li>
          ) : null}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 font-display text-2xl">Contracts</h2>
        <ul className="divide-y divide-line border-y border-line">
          {contracts.length === 0 ? (
            <li className="py-4 text-sm text-muted">No contracts yet.</li>
          ) : (
            contracts.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap justify-between gap-3 py-4"
              >
                <div>
                  <p className="font-medium">{c.title}</p>
                  <p className="text-sm text-muted">
                    {c.status.replaceAll("_", " ")}
                  </p>
                </div>
                <a
                  className="text-sm text-accent"
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
        <ul className="divide-y divide-line border-y border-line">
          {responses.length === 0 ? (
            <li className="py-4 text-sm text-muted">None yet.</li>
          ) : (
            responses.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap justify-between gap-3 py-4"
              >
                <div>
                  <p className="font-medium">{r.title}</p>
                  <p className="text-sm text-muted">
                    {r.submittedAt
                      ? `Submitted ${new Date(r.submittedAt).toLocaleString()}`
                      : "Awaiting answers"}
                  </p>
                </div>
                <a
                  className="text-sm text-accent"
                  href={`/q/${r.token}`}
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
    </div>
  );
}
