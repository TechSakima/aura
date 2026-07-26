"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Field,
  Label,
  PageHeader,
  Select,
  Textarea,
  useToast,
} from "@/components/ui";
import type { Shoot, ShootPlan, ShotItem, ShotListTemplate } from "@/lib/types";

const STORAGE_KEY = (id: string) => `aura-shoot-plan-${id}`;

function shotCategory(item: ShotItem) {
  return item.category || item.section || "Detail";
}

export default function ShootHelperPage() {
  const { id } = useParams<{ id: string }>();
  const { push } = useToast();
  const [plan, setPlan] = useState<ShootPlan | null>(null);
  const [shoot, setShoot] = useState<Shoot | null>(null);
  const [templates, setTemplates] = useState<ShotListTemplate[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [category, setCategory] = useState("all");
  const [mustOnly, setMustOnly] = useState(false);
  const [preview, setPreview] = useState<ShotItem | null>(null);

  const exitHref = shoot?.clientId
    ? `/admin/clients/${shoot.clientId}/shoots/${id}?step=shoot-day`
    : `/admin/shoots/${id}`;

  async function load() {
    const res = await fetch(`/api/shoots/${id}/plan`);
    const data = await res.json();
    setPlan(data.plan);
    setShoot(data.shoot || null);
    setTemplates(data.templates || []);
    if (!templateId && data.templates?.[0]) setTemplateId(data.templates[0].id);
    if (data.plan) {
      localStorage.setItem(STORAGE_KEY(id), JSON.stringify(data.plan));
    } else {
      const cached = localStorage.getItem(STORAGE_KEY(id));
      if (cached) {
        try {
          setPlan(JSON.parse(cached) as ShootPlan);
        } catch {
          // ignore
        }
      }
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

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
  }, []);

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
    const res = await fetch(`/api/shoots/${id}/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId, force: true }),
    });
    if (!res.ok) {
      push("Could not create plan", "danger");
      return;
    }
    push("Shoot plan ready", "success");
    await load();
  }

  async function toggle(itemId: string, doneNext: boolean) {
    if (!plan) return;
    const optimistic = {
      ...plan,
      items: plan.items.map((i) =>
        i.id === itemId ? { ...i, done: doneNext } : i,
      ),
    };
    setPlan(optimistic);
    localStorage.setItem(STORAGE_KEY(id), JSON.stringify(optimistic));
    await fetch(`/api/shoots/${id}/plan`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, done: doneNext }),
    });
  }

  async function saveNotes(dayNotes: string) {
    if (!plan) return;
    setPlan({ ...plan, dayNotes });
    await fetch(`/api/shoots/${id}/plan`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dayNotes }),
    });
  }

  return (
    <div className="pb-16">
      <PageHeader
        title="Photoshoot helper"
        description="Phone-first checklist — check off shots so nothing gets missed."
        actions={
          <Link
            href={exitHref}
            className="inline-flex min-h-11 items-center rounded-md border border-line px-3 text-sm no-underline"
          >
            Exit helper
          </Link>
        }
      />

      {!plan ? (
        <Card className="space-y-4 p-5">
          <p className="text-muted">No plan for this shoot yet.</p>
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
        </Card>
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
              onClick={() => setMustOnly((v) => !v)}
            >
              Must-haves only
            </Button>
          </div>

          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {categories.map((s) => (
              <Button
                key={s}
                size="sm"
                tone={category === s ? "neutral" : "ghost"}
                onClick={() => setCategory(s)}
              >
                {s}
              </Button>
            ))}
          </div>

          <Field className="mb-6">
            <Label htmlFor="notes">Day notes</Label>
            <Textarea
              id="notes"
              value={plan.dayNotes || ""}
              onChange={(e) =>
                setPlan({ ...plan, dayNotes: e.target.value })
              }
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
                  <button
                    type="button"
                    aria-label={item.done ? "Mark incomplete" : "Mark done"}
                    className={`mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-md border ${
                      item.done
                        ? "border-success bg-success text-success-ink"
                        : "border-line bg-surface"
                    }`}
                    onClick={() => void toggle(item.id, !item.done)}
                  >
                    {item.done ? "✓" : ""}
                  </button>
                  {item.referenceImageUrl ? (
                    <button
                      type="button"
                      className="shrink-0"
                      onClick={() => setPreview(item)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.referenceImageUrl}
                        alt=""
                        className="h-14 w-14 rounded object-cover"
                      />
                    </button>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{item.label}</p>
                      {item.mustHave ? (
                        <Badge tone="danger">Must</Badge>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted">{shotCategory(item)}</p>
                    {item.note ? (
                      <p className="mt-1 text-sm text-muted">{item.note}</p>
                    ) : null}
                    {item.referenceImageUrl ? (
                      <button
                        type="button"
                        className="mt-2 text-sm text-accent"
                        onClick={() => setPreview(item)}
                      >
                        View example
                      </button>
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
                Nice work. Review nice-to-haves or wrap the shoot.
              </p>
              <Button
                className="mt-4"
                onClick={async () => {
                  await fetch(`/api/shoots/${id}/plan`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ complete: true }),
                  });
                  push("Plan marked complete", "success");
                }}
              >
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
      )}

      {preview ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-4 sm:items-center">
          <Card className="relative max-h-[85vh] w-full max-w-lg overflow-auto p-5">
            <h2 className="font-display text-2xl">{preview.label}</h2>
            <p className="mt-1 text-sm text-muted">{shotCategory(preview)}</p>
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
          </Card>
        </div>
      ) : null}
    </div>
  );
}
