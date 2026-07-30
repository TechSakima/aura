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
  StatusBadge,
  Textarea,
  useToast,
} from "@/components/ui";
import { ADMIN_LIST_PAGE } from "@/lib/admin-list-page";

import type { Project } from "@/lib/types";

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
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [showArchived, setShowArchived] = useState(false);

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
    if (showArchived) params.set("includeArchived", "1");
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
  }, [debouncedQ, showArchived]);

  // Dashboard first-project CTA → open create form (AURA-260).
  useEffect(() => {
    if (searchParams.get("new") !== "1") return;
    setAdding(true);
    setQ("");
    router.replace("/admin/projects", { scroll: false });
  }, [searchParams, router]);

  function resetForm() {
    setName("");
    setEmail("");
    setPhone("");
    setNotes("");
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, notes, type: projectType }),
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
    router.push(`/admin/projects/${project.id}`);
  }

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
                placeholder="Optional — required when emailing"
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
          <Field className="max-w-md">
            <Label htmlFor="q">Search</Label>
            <Input
              id="q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name, email, phone"
            />
          </Field>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <Checkbox
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            Show archived
          </label>
          {loading ? (
            <EmptyState variant="loading" title="Loading projects…" />
          ) : projects.length === 0 ? (
            <EmptyState
              title={total === 0 && !debouncedQ ? "No projects yet" : "No matches"}
              description={
                total === 0 && !debouncedQ ? undefined : "Try a different search."
              }
              action={
                total === 0 && !debouncedQ && !adding ? (
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
                {projects.map((c) => (
                  <ListRow key={c.id} href={`/admin/projects/${c.id}`}>
                    <div className="min-w-0">
                      <p className="font-display text-xl text-ink">{c.name}</p>
                      <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
                        <span className="truncate">{c.type || "Project"}</span>
                        <StatusBadge
                          domain="projectStage"
                          value={c.stage || "inquiry"}
                        />
                        {c.email ? (
                          <span className="truncate">· {c.email}</span>
                        ) : null}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm text-accent">Open</span>
                  </ListRow>
                ))}
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
