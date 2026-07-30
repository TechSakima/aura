"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Button,
  Field,
  Label,
  Select,
  Textarea,
  useConfirm,
  useToast,
} from "@/components/ui";
import type { Shoot, ShootPlan } from "@/lib/types";

export function PrepStep({
  shoot,
  plan,
  templates,
  onChanged,
}: {
  shoot: Shoot;
  plan: ShootPlan | null;
  templates: { id: string; name: string; shootType: string; itemCount: number }[];
  onChanged: () => Promise<unknown>;
}) {
  const { push } = useToast();
  const { confirm } = useConfirm();
  const defaultTemplate =
    templates.find((t) => t.shootType === shoot.type)?.id || templates[0]?.id || "";
  const [templateId, setTemplateId] = useState(defaultTemplate);
  const [dayNotes, setDayNotes] = useState(plan?.dayNotes || "");
  const [busy, setBusy] = useState(false);

  async function createOrRefreshPlan() {
    if (!templateId) {
      push("Add a shot list template in Prep first", "danger");
      return;
    }
    if (plan) {
      const ok = await confirm({
        title: "Refresh plan from template?",
        message:
          "This replaces the current list. Checked-off progress on shoot day will be lost.",
        confirmLabel: "Refresh plan",
        tone: "danger",
      });
      if (!ok) return;
    }
    setBusy(true);
    const res = await fetch(`/api/shoots/${shoot.id}/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId, force: true }),
    });
    if (!res.ok) {
      setBusy(false);
      push("Could not create plan", "danger");
      return;
    }
    if (dayNotes) {
      await fetch(`/api/shoots/${shoot.id}/plan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayNotes }),
      });
    }
    setBusy(false);
    push("Shoot plan ready", "success");
    await onChanged();
  }

  async function saveNotes() {
    if (!plan) return;
    setBusy(true);
    const res = await fetch(`/api/shoots/${shoot.id}/plan`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dayNotes }),
    });
    setBusy(false);
    if (!res.ok) {
      push("Could not save notes", "danger");
      return;
    }
    push("Notes saved", "success");
    await onChanged();
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl">Prep</h2>
        <p className="mt-1 text-sm text-muted">
          Build this session&apos;s plan from your shot library — must-haves,
          categories, and optional reference photos for shoot day.{" "}
          <Link href="/admin/prep" className="text-accent">
            Manage shot library
          </Link>
        </p>
      </div>

      <Field>
        <Label>Shot list template</Label>
        <Select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
        >
          {templates.length === 0 ? (
            <option value="">No templates yet</option>
          ) : (
            templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.itemCount} shots)
              </option>
            ))
          )}
        </Select>
      </Field>

      <Field>
        <Label>Day notes</Label>
        <Textarea
          value={dayNotes}
          onChange={(e) => setDayNotes(e.target.value)}
          placeholder="Timeline, venue notes, must-get moments…"
        />
      </Field>

      <div className="flex flex-wrap gap-2">
        <Button disabled={busy} onClick={() => void createOrRefreshPlan()}>
          {plan ? "Refresh plan from template" : "Create shoot plan"}
        </Button>
        {plan ? (
          <Button tone="ghost" disabled={busy} onClick={() => void saveNotes()}>
            Save notes only
          </Button>
        ) : null}
      </div>

      {plan ? (
        <div className="space-y-2">
          <p className="text-sm text-muted">
            Plan ready: {plan.items.filter((i) => i.done).length}/{plan.items.length}{" "}
            shots checked off.
          </p>
          <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
            {plan.items.slice(0, 12).map((item) => (
              <li key={item.id} className="flex items-center gap-2">
                {item.referenceImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.referenceImageUrl}
                    alt=""
                    className="h-8 w-8 rounded object-cover"
                  />
                ) : (
                  <span className="inline-block h-8 w-8 rounded bg-line" />
                )}
                <span>
                  <span className="text-muted">
                    {item.category || item.section} ·{" "}
                  </span>
                  {item.label}
                </span>
              </li>
            ))}
            {plan.items.length > 12 ? (
              <li className="text-muted">+{plan.items.length - 12} more</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
