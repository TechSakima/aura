"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProjectMessagesTrail } from "@/components/admin/ProjectMessagesTrail";
import { ProjectWorkflowPanel } from "@/components/admin/ProjectWorkflowPanel";
import { ShootPublicLinks } from "@/components/admin/ShootPublicLinks";
import {
  ActionStack,
  Button,
  Checkbox,
  EmptyState,
  Field,
  Input,
  Label,
  PageHeader,
  SectionIntro,
  StatusBadge,
  Textarea,
  useConfirm,
  useToast,
} from "@/components/ui";

import { projectHref, sessionToolsHref } from "@/lib/admin-deep-links";
import { adminPathSegment } from "@/lib/admin-slug";
import { mutateJson } from "@/lib/client/mutation";
import {
  confirmArchiveProject,
  confirmDeleteProject,
  confirmDeleteSession,
  confirmUnarchiveProject,
} from "@/lib/destructive-confirm";
import type { Project, ProjectSession } from "@/lib/types";
import { deriveWizardProgress } from "@/lib/wizard/steps";
import {
  sessionToolsUnlocked,
  workflowStepLabel,
} from "@/lib/workflow/path";

type SessionRow = ProjectSession & {
  currentStep?: string;
  label?: string;
  quoteToken?: string;
  galleryToken?: string;
  galleryStatus?: string;
  prepComplete?: boolean;
  deliveryComplete?: boolean;
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
  const [loadError, setLoadError] = useState("");
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [updateCustomTitles, setUpdateCustomTitles] = useState(false);
  const [sessionType, setSessionType] = useState("Wedding");
  const [sessionDate, setSessionDate] = useState("");

  async function load() {
    setLoadError("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    let res: Response;
    try {
      res = await fetch(`/api/projects/${id}`, { signal: controller.signal });
    } catch (e) {
      window.clearTimeout(timeout);
      setLoadError(
        e instanceof Error && e.name === "AbortError"
          ? "Taking too long — check your connection and retry."
          : "Could not load project.",
      );
      return;
    }
    window.clearTimeout(timeout);
    if (!res.ok) {
      push("Project not found", "danger");
      router.push("/admin/projects");
      return;
    }
    const data = await res.json();
    const p = data.project as Project;
    setProject(p);
    setName(p.name);
    setEmail(p.email);
    setPhone(p.phone || "");
    setNotes(p.notes || "");

    const pretty = projectHref(adminPathSegment(p));
    if (pretty !== `/admin/projects/${id}`) {
      router.replace(pretty);
    }

    const summaries = (data.sessions || []) as SessionRow[];
    if (summaries.some((s) => s.currentStep != null)) {
      setSessions(summaries);
      return;
    }

    const rows = await Promise.all(
      summaries.map(async (shoot): Promise<SessionRow> => {
        try {
          const wiz = await fetch(`/api/sessions/${shoot.id}/wizard`);
          if (!wiz.ok) {
            return {
              ...shoot,
              type: shoot.type,
              status: shoot.status,
            };
          }
          const w = await wiz.json();
          const progress = deriveWizardProgress({
            shoot: w.session || w.shoot,
            proposal: w.proposal,
            plan: w.plan,
            gallery: w.gallery,
            photoCount: w.photoCount,
          });
          return {
            ...shoot,
            type: shoot.type,
            status: shoot.status,
            currentStep: progress.currentStep,
            label: progress.currentStep.replace("-", " "),
            quoteToken: w.proposal?.token,
            galleryToken: w.gallery?.publicToken,
            galleryStatus: w.gallery?.status,
            prepComplete: progress.completed.includes("prep"),
            deliveryComplete: progress.completed.includes("delivery"),
          };
        } catch {
          return {
            ...shoot,
            type: shoot.type,
            status: shoot.status,
          };
        }
      },
    ),
  );
  setSessions(rows);
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function saveProject(e: FormEvent) {
    e.preventDefault();
    const nameChanged =
      Boolean(project && name.trim() && name.trim() !== project.name);
    const result = await mutateJson<{ project: Project }>(
      `/api/projects/${id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          notes,
          ...(nameChanged
            ? {
                renameTitles: updateCustomTitles ? "all" : "auto",
              }
            : {}),
        }),
      },
      { action: "save" },
    );
    if (!result.ok) {
      push(result.errorMessage, "danger");
      return;
    }
    setProject(result.data.project);
    setEditing(false);
    setUpdateCustomTitles(false);
    push("Project updated", "success");
  }

  async function createSession(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: id,
        type: sessionType,
        startsAt: sessionDate || undefined,
      }),
    });
    if (!res.ok) {
      push("Could not create session", "danger");
      return;
    }
    const data = await res.json();
    const session = data.session as ProjectSession;
    const prepHref = sessionToolsHref({
      project: project || { id },
      session,
      step: "prep",
    });

    if (data.calendarSyncFailed) {
      push("Session created · calendar not updated", "danger");
    }

    if (sessionToolsUnlocked(project?.workflowStep)) {
      if (!data.calendarSyncFailed) push("Session created", "success");
      router.push(prepHref);
      return;
    }

    const openPrep = await confirm({
      title: `Open ${workflowStepLabel("prep")}?`,
      message:
        "Earlier steps aren’t finished yet. Stay on the project workflow, or open the plan for this session.",
      confirmLabel: "Open plan",
      cancelLabel: "Stay on project",
      tone: "neutral",
    });
    if (!data.calendarSyncFailed) push("Session created", "success");
    if (openPrep) {
      router.push(prepHref);
      return;
    }
    setSessionType("Wedding");
    setSessionDate("");
    await load();
  }

  async function copyCancelLink() {
    if (!project?.cancelToken) return;
    const url = `${window.location.origin}/cancel/${project.cancelToken}`;
    try {
      await navigator.clipboard.writeText(url);
      push("Link copied", "success");
    } catch {
      push("Could not copy", "danger");
    }
  }

  async function archiveProjectAction() {
    if (!project) return;
    const archiving = project.stage !== "archived";
    const ok = await confirm(
      archiving
        ? confirmArchiveProject(project.name)
        : confirmUnarchiveProject(project.name),
    );
    if (!ok) return;
    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        archiving ? { stage: "archived" } : { unarchive: true },
      ),
    });
    if (!res.ok) {
      push("Could not update project", "danger");
      return;
    }
    push(archiving ? "Project archived" : "Project restored", "success");
    await load();
  }

  async function deleteProjectAction() {
    if (!project) return;
    const ok = await confirm(confirmDeleteProject(project.name));
    if (!ok) return;
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (!res.ok) {
      push("Could not delete project", "danger");
      return;
    }
    push("Project deleted", "success");
    router.push("/admin/projects");
  }

  async function deleteSession(session: SessionRow) {
    const label =
      [session.type, session.startsAt?.slice(0, 10)].filter(Boolean).join(" · ") ||
      "Session";
    const ok = await confirm(confirmDeleteSession(label));
    if (!ok) return;
    const res = await fetch(`/api/sessions/${session.id}`, { method: "DELETE" });
    if (!res.ok) {
      push("Could not delete session", "danger");
      return;
    }
    push("Session deleted", "success");
    setSessions((prev) => prev.filter((s) => s.id !== session.id));
  }

  if (loadError && !project) {
    return (
      <EmptyState
        variant="error"
        title={loadError}
        action={<Button onClick={() => void load()}>Retry</Button>}
      />
    );
  }

  if (!project) {
    return <EmptyState variant="loading" title="Loading project…" />;
  }

  return (
    <div className="space-y-10 sm:space-y-12">
      <PageHeader
        eyebrow="Project"
        title={project.name}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <span>{project.type || "Project"}</span>
            <StatusBadge
              domain="projectStage"
              value={project.stage || "inquiry"}
            />
          </span>
        }
        actions={
          <ActionStack
            primaryId="all"
            moreLabel="More"
            menuIds={[
              ...(project.cancelToken ? ["cancel-link"] : []),
              "archive",
              "delete",
            ]}
            actions={[
              {
                id: "all",
                label: "All projects",
                href: "/admin/projects",
                tone: "ghost",
              },
              ...(project.cancelToken
                ? [
                    {
                      id: "cancel-link",
                      label: "Copy change link",
                      tone: "ghost" as const,
                      onClick: () => void copyCancelLink(),
                    },
                  ]
                : []),
              {
                id: "archive",
                label:
                  project.stage === "archived" ? "Unarchive" : "Archive",
                tone: "ghost",
                onClick: () => void archiveProjectAction(),
              },
              {
                id: "delete",
                label: "Delete",
                tone: "danger",
                onClick: () => void deleteProjectAction(),
              },
            ]}
          />
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
            <Button
              tone="ghost"
              size="sm"
              onClick={() => {
                setEditing((v) => {
                  if (v) setUpdateCustomTitles(false);
                  return !v;
                });
              }}
            >
              {editing ? "Cancel" : "Edit"}
            </Button>
          }
        />
        {editing ? (
          <form onSubmit={saveProject} className="max-w-lg space-y-4">
            <Field>
              <Label>Project name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
              {project && name.trim() && name.trim() !== project.name ? (
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-muted">
                    Auto gallery and payment titles update.
                  </p>
                  <label className="flex min-h-11 items-center gap-2 text-sm text-muted">
                    <Checkbox
                      checked={updateCustomTitles}
                      onChange={(e) => setUpdateCustomTitles(e.target.checked)}
                    />
                    Update custom titles too
                  </label>
                </div>
              ) : null}
            </Field>
            <Field>
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Optional until you send"
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
              <dd className="mt-1 break-all">
                {project.email?.trim() || "—"}
              </dd>
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

      <ProjectMessagesTrail projectId={id} />

      <section className="space-y-5">
        <SectionIntro title="New session" />
        <form
          onSubmit={createSession}
          className="grid max-w-3xl gap-4 sm:grid-cols-3"
        >
          <Field>
            <Label>Session label</Label>
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
              Add session
            </Button>
          </div>
        </form>
      </section>

      <section className="space-y-5">
        <SectionIntro title="Sessions" />
        {sessions.length === 0 ? (
          <EmptyState
            title="No sessions yet"
            description="Add a session for shoot day and delivery."
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
                  <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
                    <span>{s.startsAt?.slice(0, 10) || "Date TBD"}</span>
                    <StatusBadge domain="sessionStatus" value={s.status} />
                    {s.label ? <span>· Next: {s.label}</span> : null}
                  </p>
                  <ShootPublicLinks
                    className="mt-3"
                    quoteToken={s.quoteToken}
                    galleryToken={s.galleryToken}
                  />
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Link
                    href={sessionToolsHref({
                      project: project || { id },
                      session: s,
                      step:
                        s.currentStep === "intake" ||
                        s.currentStep === "proposal" ||
                        !s.currentStep
                          ? "prep"
                          : (s.currentStep as
                              | "prep"
                              | "shoot-day"
                              | "delivery"
                              | "wrap"),
                    })}
                  >
                    <Button size="sm">Open session</Button>
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
