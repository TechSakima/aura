"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Button,
  Card,
  Checkbox,
  EmptyState,
  Field,
  Input,
  Label,
  List,
  ListRow,
  PageHeader,
  PROJECT_STAGE_FILTER_OPTIONS,
  Select,
  StatusBadge,
  Textarea,
  useToast,
} from "@/components/ui";
import { ADMIN_LIST_PAGE } from "@/lib/admin-list-page";
import {
  PROJECT_PATH_STEPS,
  workflowStepLabel,
} from "@/lib/workflow/path";

import type { Project, ProjectStage, ProjectWorkflowStep } from "@/lib/types";

function ProjectsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { push } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [projectType, setProjectType] = useState("Wedding");
  const [contactMessageId, setContactMessageId] = useState("");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [stageFilter, setStageFilter] = useState("");
  const [workflowFilter, setWorkflowFilter] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => window.clearTimeout(t);
  }, [q]);

  async function loadPage(offset: number, append: boolean) {
    if (append) setLoadingMore(true);
    else setLoading(true);
    const params = new URLSearchParams({
      offset: String(offset),
      limit: String(ADMIN_LIST_PAGE),
    });
    if (debouncedQ) params.set("q", debouncedQ);
    if (showArchived || stageFilter === "archived") {
      params.set("includeArchived", "1");
    }
    if (stageFilter) params.set("stage", stageFilter);
    if (workflowFilter) params.set("workflowStep", workflowFilter);
    const res = await fetch(`/api/projects?${params}`);
    if (!res.ok) {
      setLoading(false);
      setLoadingMore(false);
      push("Could not load projects", "danger");
      return;
    }
    const data = await res.json();
    const next = (data.projects || []) as Project[];
    setProjects((prev) => (append ? [...prev, ...next] : next));
    setHasMore(Boolean(data.hasMore));
    setTotal(Number(data.total) || next.length);
    setLoading(false);
    setLoadingMore(false);
  }

  useEffect(() => {
    void loadPage(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, showArchived, stageFilter, workflowFilter]);

  // New project deep-link (+ optional contact prefill) — AURA-260 / AURA-421.
  useEffect(() => {
    if (searchParams.get("new") !== "1") return;
    const contactId = searchParams.get("contact")?.trim() || "";
    setAdding(true);
    setQ("");
    setContactMessageId(contactId);
    router.replace("/admin/projects", { scroll: false });
    if (!contactId) return;
    void (async () => {
      const res = await fetch(`/api/contact-messages/${contactId}`);
      if (!res.ok) return;
      const data = (await res.json()) as {
        name?: string;
        email?: string;
        phone?: string;
        message?: string;
        context?: string;
        source?: string;
        projectId?: string;
      };
      if (data.projectId) {
        router.push(`/admin/projects/${data.projectId}#messages`);
        return;
      }
      setName(String(data.name || "").trim());
      setEmail(String(data.email || "").trim());
      setPhone(String(data.phone || "").trim());
      const bits = [
        data.context?.trim(),
        data.message?.trim(),
        data.source ? `Via ${data.source}` : "",
      ].filter(Boolean);
      setNotes(bits.join("\n\n"));
    })();
  }, [searchParams, router]);

  function resetForm() {
    setName("");
    setEmail("");
    setPhone("");
    setNotes("");
    setContactMessageId("");
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        phone,
        notes,
        type: projectType,
        ...(contactMessageId ? { contactMessageId } : {}),
      }),
    });
    if (!res.ok) {
      push("Could not save project", "danger");
      return;
    }
    const data = await res.json();
    const project = data.project as Project;
    setProjects((prev) => [project, ...prev]);
    setTotal((n) => n + 1);
    resetForm();
    setAdding(false);
    push("Project saved", "success");
    router.push(
      contactMessageId
        ? `/admin/projects/${project.adminSlug || project.id}#messages`
        : `/admin/projects/${project.adminSlug || project.id}`,
    );
  }

  const filteredEmpty =
    Boolean(debouncedQ || stageFilter || workflowFilter) || showArchived;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Studio"
        title="Projects"
        actions={
          adding ? (
            <Button
              tone="ghost"
              onClick={() => {
                setAdding(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
          ) : (
            <Button
              onClick={() => {
                setAdding(true);
                setQ("");
              }}
            >
              New project
            </Button>
          )
        }
      />

      {adding ? (
        <Card className="mx-auto max-w-lg p-5">
          <h2 className="mb-4 font-display text-2xl">New project</h2>
          <form onSubmit={onCreate} className="space-y-4">
            <Field>
              <Label htmlFor="name">Project name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </Field>
            <Field>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Optional until you send"
              />
            </Field>
            <Field>
              <Label htmlFor="type">Project type</Label>
              <Input
                id="type"
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
                placeholder="Wedding, Portrait…"
              />
            </Field>
            <Field>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Field>
            <Field>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button type="submit">Save project</Button>
              <Button
                type="button"
                tone="ghost"
                onClick={() => {
                  setAdding(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field className="sm:col-span-2 lg:col-span-1">
              <Label htmlFor="q">Search</Label>
              <Input
                id="q"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Name, email, phone"
              />
            </Field>
            <Field>
              <Label htmlFor="stage">Stage</Label>
              <Select
                id="stage"
                value={stageFilter}
                onChange={(e) => {
                  const next = e.target.value;
                  setStageFilter(next);
                  if (next === "archived") setShowArchived(true);
                }}
              >
                <option value="">All stages</option>
                {PROJECT_STAGE_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              <Label htmlFor="workflow">Workflow</Label>
              <Select
                id="workflow"
                value={workflowFilter}
                onChange={(e) => setWorkflowFilter(e.target.value)}
              >
                <option value="">All steps</option>
                {PROJECT_PATH_STEPS.map((step) => (
                  <option key={step.id} value={step.id}>
                    {step.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <Checkbox
              checked={showArchived || stageFilter === "archived"}
              onChange={(e) => {
                setShowArchived(e.target.checked);
                if (!e.target.checked && stageFilter === "archived") {
                  setStageFilter("");
                }
              }}
            />
            Show archived
          </label>
          {loading ? (
            <EmptyState variant="loading" title="Loading projects…" />
          ) : projects.length === 0 ? (
            <EmptyState
              title={
                total === 0 && !filteredEmpty ? "No projects yet" : "No matches"
              }
              description={
                total === 0 && !filteredEmpty
                  ? undefined
                  : "Try a different search or filter."
              }
              action={
                total === 0 && !filteredEmpty && !adding ? (
                  <Button
                    onClick={() => {
                      setAdding(true);
                      setQ("");
                    }}
                  >
                    New project
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-4">
              <List>
                {projects.map((c) => {
                  const stage = (c.stage || "inquiry") as ProjectStage;
                  const step = (c.workflowStep ||
                    "inquiry") as ProjectWorkflowStep;
                  const stepLabel = workflowStepLabel(step);
                  return (
                    <ListRow
                      key={c.id}
                      href={`/admin/projects/${c.adminSlug || c.id}`}
                    >
                      <div className="min-w-0">
                        <p className="font-display text-xl text-ink">
                          {c.name}
                        </p>
                        <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
                          <span className="truncate">
                            {c.type || "Project"}
                          </span>
                          <StatusBadge domain="projectStage" value={stage} />
                          <span className="truncate">· {stepLabel}</span>
                          {c.email ? (
                            <span className="truncate">· {c.email}</span>
                          ) : null}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm text-accent">Open</span>
                    </ListRow>
                  );
                })}
              </List>
              {hasMore ? (
                <Button
                  type="button"
                  tone="neutral"
                  className="min-h-11 w-full sm:w-auto"
                  pending={loadingMore}
                  pendingLabel="Loading…"
                  onClick={() => void loadPage(projects.length, true)}
                >
                  Load more
                </Button>
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense
      fallback={<EmptyState variant="loading" title="Loading projects…" />}
    >
      <ProjectsPageInner />
    </Suspense>
  );
}
