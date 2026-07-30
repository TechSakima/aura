"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  Checkbox,
  Dialog,
  EmptyState,
  Field,
  Label,
  PageHeader,
  ScrollRail,
  Select,
  Textarea,
  useToast,
} from "@/components/ui";
import { mutationOfflineMessage } from "@/lib/offline";
import type { Shoot, ShootPlan, ShotItem, ShotListTemplate } from "@/lib/types";

function shotCategory(item: ShotItem) {
  return item.category || item.section || "Detail";
}

function prefsKey(sessionId: string) {
  return `aura-shoot-day:${sessionId}`;
}

function readPrefs(sessionId: string): { category: string; mustOnly: boolean } {
  try {
    const raw = localStorage.getItem(prefsKey(sessionId));
    if (!raw) return { category: "all", mustOnly: false };
    const parsed = JSON.parse(raw) as { category?: string; mustOnly?: boolean };
    return {
      category: typeof parsed.category === "string" ? parsed.category : "all",
      mustOnly: Boolean(parsed.mustOnly),
    };
  } catch {
    return { category: "all", mustOnly: false };
  }
}

function writePrefs(
  sessionId: string,
  prefs: { category: string; mustOnly: boolean },
) {
  try {
    localStorage.setItem(prefsKey(sessionId), JSON.stringify(prefs));
  } catch {
    /* ignore quota */
  }
}

type SessionShootDayProps = {
  sessionId: string;
  /** page = full helper; embedded = wizard Shoot day step */
  variant?: "page" | "embedded";
  /** Seed from wizard bundle (embedded). */
  plan?: ShootPlan | null;
  templates?: ShotListTemplate[];
  projectId?: string;
  onChanged?: () => Promise<unknown>;
};

/**
 * Shared shoot-day checklist (AURA-068).
 * Wake lock, optimistic saves, mark complete, and filter prefs for page + wizard.
 */
export function SessionShootDay({
  sessionId,
  variant = "page",
  plan: planProp,
  templates: templatesProp,
  projectId: projectIdProp,
  onChanged,
}: SessionShootDayProps) {
  const { push } = useToast();
  const embedded = variant === "embedded";

  const [plan, setPlan] = useState<ShootPlan | null>(planProp ?? null);
  const [shoot, setShoot] = useState<Shoot | null>(null);
  const [templates, setTemplates] = useState<ShotListTemplate[]>(
    templatesProp || [],
  );
  const [templateId, setTemplateId] = useState("");
  const [category, setCategory] = useState("all");
  const [mustOnly, setMustOnly] = useState(false);
  const [preview, setPreview] = useState<ShotItem | null>(null);
  const [loading, setLoading] = useState(!embedded);

  const projectId =
    projectIdProp || shoot?.projectId || shoot?.clientId || undefined;
  const exitHref = projectId
    ? `/admin/projects/${projectId}/sessions/${sessionId}?step=shoot-day`
    : `/admin/projects`;
  const helperHref = `/admin/shoots/${sessionId}/helper`;

  useEffect(() => {
    if (embedded) {
      setPlan(planProp ?? null);
      if (templatesProp) setTemplates(templatesProp);
    }
  }, [embedded, planProp, templatesProp]);

  useEffect(() => {
    const prefs = readPrefs(sessionId);
    setCategory(prefs.category);
    setMustOnly(prefs.mustOnly);
  }, [sessionId]);

  useEffect(() => {
    writePrefs(sessionId, { category, mustOnly });
  }, [sessionId, category, mustOnly]);

  async function load() {
    const res = await fetch(`/api/sessions/${sessionId}/plan`);
    if (!res.ok) {
      push("Could not load plan", "danger");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setPlan(data.plan);
    setShoot(data.shoot || null);
    setTemplates(data.templates || []);
    setTemplateId((prev) => prev || data.templates?.[0]?.id || "");
    setLoading(false);
  }

  useEffect(() => {
    if (embedded) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, embedded]);

  useEffect(() => {
    let wake: { release: () => void } | null = null;
    const nav = navigator as Navigator & {
      wakeLock?: { request: (t: string) => Promise<{ release: () => void }> };
    };
    void nav.wakeLock
      ?.request("screen")
      .then((lock) => {
        wake = lock;
      })
      .catch(() => undefined);
    return () => wake?.release();
  }, [sessionId]);

  const categories = useMemo(() => {
    const set = new Set((plan?.items || []).map(shotCategory));
    return ["all", ...Array.from(set)];
  }, [plan]);

  const visible = (plan?.items || []).filter((i) => {
    if (mustOnly && !i.mustHave) return false;
    if (category !== "all" && shotCategory(i) !== category) return false;
    return true;
  });

  const done = plan?.items.filter((i) => i.done).length || 0;
  const total = plan?.items.length || 0;
  const mustLeft =
    plan?.items.filter((i) => i.mustHave && !i.done).length || 0;

  async function createPlan() {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, force: true }),
      });
      if (!res.ok) {
        push("Could not create plan", "danger");
        return;
      }
      push("Plan ready", "success");
      if (onChanged) await onChanged();
      else await load();
    } catch {
      push(mutationOfflineMessage("create plan"), "danger");
    }
  }

  async function toggle(itemId: string, doneNext: boolean) {
    if (!plan) return;
    const previous = plan;
    const optimistic = {
      ...plan,
      items: plan.items.map((i) =>
        i.id === itemId ? { ...i, done: doneNext } : i,
      ),
    };
    setPlan(optimistic);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/plan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, done: doneNext }),
      });
      if (!res.ok) {
        setPlan(previous);
        push("Could not save — reload to sync", "danger");
        if (onChanged) await onChanged();
        else await load();
        return;
      }
      if (onChanged) await onChanged();
    } catch {
      setPlan(previous);
      push(mutationOfflineMessage("save"), "danger");
    }
  }

  async function saveNotes(dayNotes: string) {
    if (!plan) return;
    const previous = plan.dayNotes;
    setPlan({ ...plan, dayNotes });
    try {
      const res = await fetch(`/api/sessions/${sessionId}/plan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayNotes }),
      });
      if (!res.ok) {
        setPlan({ ...plan, dayNotes: previous });
        push(mutationOfflineMessage("save notes"), "danger");
        return;
      }
      if (onChanged) await onChanged();
    } catch {
      setPlan({ ...plan, dayNotes: previous });
      push(mutationOfflineMessage("save notes"), "danger");
    }
  }

  async function markComplete() {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/plan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complete: true }),
      });
      if (!res.ok) {
        push(mutationOfflineMessage("complete plan"), "danger");
        return;
      }
      push("Plan marked complete", "success");
      if (onChanged) await onChanged();
      else await load();
    } catch {
      push(mutationOfflineMessage("complete plan"), "danger");
    }
  }

  if (loading) {
    return <EmptyState variant="loading" title="Loading shoot day…" />;
  }

  const empty = (
    <Card className="space-y-4 p-5">
      <p className="text-muted">
        {embedded
          ? "No plan yet. Attach a shot list in Prep, or continue to Delivery if you're shooting freestyle."
          : "No plan for this session yet."}
      </p>
      {!embedded && templates.length > 0 ? (
        <>
          <Field>
            <Label>Template</Label>
            <Select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
          <Button onClick={() => void createPlan()}>Start shoot plan</Button>
        </>
      ) : null}
      {embedded ? (
        <ButtonLink href="/admin/prep?tab=shots" tone="ghost" className="min-h-11">
          Open Library
        </ButtonLink>
      ) : null}
    </Card>
  );

  const body = !plan ? (
    empty
  ) : (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Badge tone="accent">
          {done}/{total} done
        </Badge>
        <Badge tone={mustLeft ? "danger" : "success"}>
          {mustLeft} must-haves left
        </Badge>
        <Button
          size="sm"
          tone={mustOnly ? "accent" : "ghost"}
          className="min-h-11"
          onClick={() => setMustOnly((v) => !v)}
        >
          Must-haves only
        </Button>
        {embedded ? (
          <ButtonLink href={helperHref} tone="ghost" size="sm" className="min-h-11">
            Full screen
          </ButtonLink>
        ) : null}
      </div>

      <ScrollRail
        className="mb-4"
        fadeFrom="canvas"
        aria-label="Shot categories"
        contentClassName="gap-2 pb-1"
      >
        {categories.map((s) => (
          <Button
            key={s}
            size="sm"
            className="min-h-11 shrink-0"
            tone={category === s ? "neutral" : "ghost"}
            onClick={() => setCategory(s)}
          >
            {s}
          </Button>
        ))}
      </ScrollRail>

      <Field className="mb-6">
        <Label htmlFor={`notes-${sessionId}`}>Day notes</Label>
        <Textarea
          id={`notes-${sessionId}`}
          value={plan.dayNotes || ""}
          onChange={(e) => setPlan({ ...plan, dayNotes: e.target.value })}
          onBlur={(e) => void saveNotes(e.target.value)}
          placeholder="Weather, timeline shifts, parking…"
        />
      </Field>

      <ul className="space-y-2">
        {visible.map((item) => (
          <li key={item.id}>
            <Card
              className={`flex items-start gap-3 p-4 ${
                item.done ? "opacity-60" : ""
              }`}
            >
              <Checkbox
                className="mt-0.5"
                checked={Boolean(item.done)}
                aria-label={item.done ? "Mark incomplete" : "Mark done"}
                onChange={(e) => void toggle(item.id, e.target.checked)}
              />
              {item.referenceImageUrl ? (
                <Button
                  type="button"
                  tone="ghost"
                  size="sm"
                  className="h-14 w-14 shrink-0 overflow-hidden p-0"
                  aria-label="View example"
                  onClick={() => setPreview(item)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.referenceImageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </Button>
              ) : null}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{item.label}</p>
                  {item.mustHave ? <Badge tone="danger">Must</Badge> : null}
                </div>
                <p className="text-sm text-muted">{shotCategory(item)}</p>
                {item.note ? (
                  <p className="mt-1 text-sm text-muted">{item.note}</p>
                ) : null}
              </div>
            </Card>
          </li>
        ))}
      </ul>

      {mustLeft === 0 && total > 0 ? (
        <Card className="mt-8 p-5">
          <h2 className="font-display text-2xl">All must-haves covered</h2>
          <p className="mt-2 text-muted">
            Review nice-to-haves or wrap the session.
          </p>
          <Button className="mt-4 min-h-11" onClick={() => void markComplete()}>
            Mark plan complete
          </Button>
        </Card>
      ) : mustLeft > 0 ? (
        <Card className="mt-8 border-danger/40 p-5">
          <h2 className="font-display text-2xl">Before you leave</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            {plan.items
              .filter((i) => i.mustHave && !i.done)
              .map((i) => (
                <li key={i.id}>{i.label}</li>
              ))}
          </ul>
        </Card>
      ) : null}
    </>
  );

  return (
    <div className={embedded ? "space-y-5" : "pb-16"}>
      {embedded ? (
        <h2 className="font-display text-2xl">Shoot day</h2>
      ) : (
        <PageHeader
          title="Shoot day"
          actions={
            <ButtonLink href={exitHref} tone="ghost" size="sm" className="min-h-11">
              Exit
            </ButtonLink>
          }
        />
      )}

      {body}

      <Dialog
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        title={preview?.label || "Shot"}
      >
        {preview ? (
          <>
            <p className="text-sm text-muted">{shotCategory(preview)}</p>
            {preview.note ? (
              <p className="mt-4 whitespace-pre-wrap">{preview.note}</p>
            ) : null}
            {preview.referenceImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview.referenceImageUrl}
                alt=""
                className="mt-4 w-full rounded-md"
              />
            ) : null}
            <Button className="mt-4 w-full" onClick={() => setPreview(null)}>
              Close
            </Button>
          </>
        ) : null}
      </Dialog>
    </div>
  );
}
