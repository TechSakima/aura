"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProjectWorkflowPanel } from "@/components/admin/ProjectWorkflowPanel";
import { ShootPublicLinks } from "@/components/admin/ShootPublicLinks";
import {
  Button,
  EmptyState,
  Field,
  Input,
  Label,
  PageHeader,
  SectionIntro,
  Textarea,
  useConfirm,
  useToast,
} from "@/components/ui";
import type { Project, ProjectSession } from "@/lib/types";
import { deriveWizardProgress } from "@/lib/wizard/steps";

type SessionRow = ProjectSession & {
  currentStep?: string;
  label?: string;
  quoteToken?: string;
  galleryToken?: string;
  shootDate?: string;
  type: string;
  status: string;
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { push } = useToast();
  const { confirm } = useConfirm();
  const [project, setProject] = useState<Project | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [sessionType, setSessionType] = useState("Wedding");
  const [sessionDate, setSessionDate] = useState("");

  async function load() {
    const res = await fetch(`/api/clients/${id}`);
    if (!res.ok) {
      push("Project not found", "danger");
      router.push("/admin/projects");
      return;
    }
    const data = await res.json();
    const p = (data.project || data.client) as Project;
    setProject(p);
    setName(p.name);
    setEmail(p.email);
    setPhone(p.phone || "");
    setNotes(p.notes || "");

    const rows: SessionRow[] = [];
    for (const shoot of (data.shoots || data.sessions || []) as ProjectSession[]) {
      const wiz = await fetch(`/api/shoots/${shoot.id}/wizard`);
      if (wiz.ok) {
        const w = await wiz.json();
        const progress = deriveWizardProgress({
          shoot: w.shoot,
          proposal: w.proposal,
          plan: w.plan,
          gallery: w.gallery,
          photoCount: w.photoCount,
        });
        rows.push({
          ...shoot,
          type: shoot.type,
          status: shoot.status,
          shootDate: shoot.startsAt?.slice(0, 10),
          currentStep: progress.currentStep,
          label: progress.currentStep.replace("-", " "),
          quoteToken: w.proposal?.token,
          galleryToken: w.gallery?.publicToken,
        });
      } else {
        rows.push({
          ...shoot,
          type: shoot.type,
          status: shoot.status,
          shootDate: shoot.startsAt?.slice(0, 10),
        });
      }
    }
    setSessions(rows);
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function saveProject(e: FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, notes }),
    });
    if (!res.ok) {
      push("Save failed", "danger");
      return;
    }
    const data = await res.json();
    setProject(data.project || data.client);
    setEditing(false);
    push("Project updated", "success");
  }

  async function createSession(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/shoots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: id,
        projectId: id,
        type: sessionType,
        shootDate: sessionDate || undefined,
      }),
    });
    if (!res.ok) {
      push("Could not create session", "danger");
      return;
    }
    const data = await res.json();
    const session = data.session || data.shoot;
    push("Session created", "success");
    router.push(
      `/admin/projects/${id}/sessions/${session.id}?step=intake`,
    );
  }

  async function deleteSession(session: SessionRow) {
    const label = [session.type, session.shootDate].filter(Boolean).join(" · ");
    const ok = await confirm({
      title: "Delete session?",
      message: `“${label}” and its quote, plan, and gallery photos will be removed.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/shoots/${session.id}`, { method: "DELETE" });
    if (!res.ok) {
      push("Could not delete session", "danger");
      return;
    }
    push("Session deleted", "success");
    setSessions((prev) => prev.filter((s) => s.id !== session.id));
  }

  if (!project) return <p className="text-muted">Loading…</p>;

  return (
    <div className="space-y-10 sm:space-y-12">
      <PageHeader
        eyebrow="Project"
        title={project.name}
        description={`${project.type || "Project"} · ${project.stage || "inquiry"}`}
        actions={
          <Button tone="ghost" onClick={() => router.push("/admin/projects")}>
            All projects
          </Button>
        }
      />

      <ProjectWorkflowPanel
        project={project}
        sessions={sessions}
        onChanged={() => void load()}
      />

      <section className="space-y-5">
        <SectionIntro
          title="Contact"
          actions={
            <Button tone="ghost" size="sm" onClick={() => setEditing((v) => !v)}>
              {editing ? "Cancel" : "Edit"}
            </Button>
          }
        />
        {editing ? (
          <form onSubmit={saveProject} className="max-w-lg space-y-4">
            <Field>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
            <Field>
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Field>
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <Field>
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            <Button type="submit">Save</Button>
          </form>
        ) : (
          <dl className="grid gap-4 border-y border-line py-5 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted">Email</dt>
              <dd className="mt-1 break-all">{project.email}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted">Phone</dt>
              <dd className="mt-1">{project.phone || "—"}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-xs uppercase tracking-wider text-muted">Notes</dt>
              <dd className="mt-1">{project.notes || "—"}</dd>
            </div>
          </dl>
        )}
      </section>

      <section className="space-y-5">
        <SectionIntro
          title="New session"
          description="Start a workflow for booking through delivery."
        />
        <form
          onSubmit={createSession}
          className="grid max-w-3xl gap-4 sm:grid-cols-3"
        >
          <Field>
            <Label>Type</Label>
            <Input
              value={sessionType}
              onChange={(e) => setSessionType(e.target.value)}
              required
            />
          </Field>
          <Field>
            <Label>Date</Label>
            <Input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
            />
          </Field>
          <div className="flex items-end">
            <Button type="submit" className="w-full min-h-11">
              Start workflow
            </Button>
          </div>
        </form>
      </section>

      <section className="space-y-5">
        <SectionIntro title="Sessions" />
        {sessions.length === 0 ? (
          <EmptyState
            title="No sessions yet"
            description="Start a workflow to move from intake through delivery."
          />
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="flex flex-col gap-3 py-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-display text-xl">{s.type}</p>
                  <p className="text-sm text-muted">
                    {s.shootDate || "Date TBD"} · {s.status}
                    {s.label ? ` · Next: ${s.label}` : ""}
                  </p>
                  <ShootPublicLinks
                    className="mt-3"
                    quoteToken={s.quoteToken}
                    galleryToken={s.galleryToken}
                  />
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Link
                    href={`/admin/projects/${id}/sessions/${s.id}${
                      s.currentStep ? `?step=${s.currentStep}` : ""
                    }`}
                  >
                    <Button size="sm">Continue</Button>
                  </Link>
                  <Button
                    size="sm"
                    tone="ghost"
                    onClick={() => void deleteSession(s)}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
