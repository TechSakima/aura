"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Button, Card, Field, Label, Select, Textarea, useToast } from "@/components/ui";
import type { Shoot, ShootPlan, ShotItem } from "@/lib/types";

function shotCategory(item: ShotItem) {
  return item.category || item.section || "Detail";
}

export function ShootDayStep({
  shoot,
  plan,
  onChanged,
}: {
  shoot: Shoot;
  plan: ShootPlan | null;
  onChanged: () => Promise<unknown>;
}) {
  const { push } = useToast();
  const [category, setCategory] = useState("all");
  const [mustOnly, setMustOnly] = useState(false);
  const [notes, setNotes] = useState(plan?.dayNotes || "");
  const [preview, setPreview] = useState<ShotItem | null>(null);

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
  const mustLeft = plan?.items.filter((i) => i.mustHave && !i.done).length || 0;

  async function toggleItem(itemId: string, nextDone: boolean) {
    const res = await fetch(`/api/shoots/${shoot.id}/plan`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, done: nextDone }),
    });
    if (!res.ok) {
      push("Could not update shot", "danger");
      return;
    }
    await onChanged();
  }

  async function saveNotes() {
    const res = await fetch(`/api/shoots/${shoot.id}/plan`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dayNotes: notes }),
    });
    if (!res.ok) {
      push("Could not save notes", "danger");
      return;
    }
    push("Notes saved", "success");
    await onChanged();
  }

  if (!plan) {
    return (
      <div className="space-y-3">
        <h2 className="font-display text-2xl">Shoot day</h2>
        <p className="text-sm text-muted">
          No plan yet. Go back to Prep to attach a shot list, or continue to Delivery
          if you&apos;re shooting freestyle.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">Shoot day</h2>
          <p className="mt-1 text-sm text-muted">
            {done}/{total} done · {mustLeft} must-haves left
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/shoots/${shoot.id}/helper`}
            className="inline-flex min-h-11 items-center rounded-md border border-line px-3 text-sm no-underline"
          >
            Full-screen helper
          </Link>
          <Badge tone={mustLeft ? "accent" : "success"}>
            {mustLeft ? "In progress" : "Must-haves clear"}
          </Badge>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Field className="min-w-[10rem]">
          <Label>Category</Label>
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
        <label className="inline-flex items-center gap-2 self-end text-sm">
          <input
            type="checkbox"
            checked={mustOnly}
            onChange={(e) => setMustOnly(e.target.checked)}
          />
          Must-haves only
        </label>
      </div>

      <ul className="space-y-2">
        {visible.map((item) => (
          <li key={item.id}>
            <Card className="flex items-start gap-3 p-3">
              <input
                type="checkbox"
                className="mt-1 h-5 w-5"
                checked={item.done}
                onChange={(e) => void toggleItem(item.id, e.target.checked)}
              />
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
              <div className="flex-1">
                <p className="font-medium">
                  {item.label}
                  {item.mustHave ? (
                    <span className="ml-2 text-xs text-accent">must</span>
                  ) : null}
                </p>
                <p className="text-xs text-muted">{shotCategory(item)}</p>
                {item.note ? (
                  <p className="mt-1 text-sm text-muted">{item.note}</p>
                ) : null}
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <Field>
        <Label>Day notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <Button tone="ghost" onClick={() => void saveNotes()}>
        Save notes
      </Button>

      {preview ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-4 sm:items-center">
          <Card className="relative max-h-[85vh] w-full max-w-lg overflow-auto p-5">
            <h2 className="font-display text-2xl">{preview.label}</h2>
            <p className="mt-1 text-sm text-muted">{shotCategory(preview)}</p>
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
