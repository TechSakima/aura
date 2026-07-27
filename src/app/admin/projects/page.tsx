"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Label,
  PageHeader,
  Textarea,
  useToast,
} from "@/components/ui";
import type { Project } from "@/lib/types";

export default function ProjectsPage() {
  const router = useRouter();
  const { push } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [projectType, setProjectType] = useState("Wedding");
  const [q, setQ] = useState("");

  async function load() {
    const res = await fetch("/api/clients");
    if (!res.ok) {
      push("Could not load projects", "danger");
      return;
    }
    const data = await res.json();
    setProjects(data.projects || data.clients || []);
  }

  useEffect(() => {
    void load();
  }, []);

  function resetForm() {
    setName("");
    setEmail("");
    setPhone("");
    setNotes("");
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, notes, type: projectType }),
    });
    if (!res.ok) {
      push("Could not save project", "danger");
      return;
    }
    const data = await res.json();
    const project = data.project || data.client;
    setProjects((prev) => [project, ...prev]);
    resetForm();
    setAdding(false);
    push("Project saved", "success");
    router.push(`/admin/projects/${project.id}`);
  }

  const filtered = projects.filter((c) => {
    const s = q.toLowerCase();
    return (
      !s ||
      c.name.toLowerCase().includes(s) ||
      c.email.toLowerCase().includes(s) ||
      (c.phone || "").includes(s)
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Studio"
        title="Projects"
        description="Jobs and engagements — each project can have multiple sessions."
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
                required
              />
            </Field>
            <Field>
              <Label htmlFor="type">Type</Label>
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
          {filtered.length === 0 ? (
            <EmptyState
              title={projects.length === 0 ? "No projects yet" : "No matches"}
              description={
                projects.length === 0
                  ? "Create a project, then add sessions."
                  : "Try a different search."
              }
            />
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {filtered.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/admin/projects/${c.id}`}
                      className="font-display text-xl text-ink no-underline hover:opacity-80"
                    >
                      {c.name}
                    </Link>
                    <p className="truncate text-sm text-muted">
                      {c.type || "Project"} · {c.stage || "inquiry"} · {c.email}
                    </p>
                  </div>
                  <Link href={`/admin/projects/${c.id}`}>
                    <Button size="sm" tone="neutral">
                      Open
                    </Button>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
