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
import { mutateJson } from "@/lib/client/mutation";
import { confirmRefreshPlan } from "@/lib/destructive-confirm";
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
      push("Add a shot list template in Library first", "danger");
      return;
    }
    if (plan) {
      const ok = await confirm(confirmRefreshPlan());
      if (!ok) return;
    }
    setBusy(true);
    try {
      const created = await mutateJson(
        `/api/sessions/${shoot.id}/plan`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templateId, force: true }),
        },
        { action: "create plan" },
      );
      if (!created.ok) {
        push(created.errorMessage, "danger");
        return;
      }
      if (dayNotes) {
        const notes = await mutateJson(
          `/api/sessions/${shoot.id}/plan`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dayNotes }),
          },
          { action: "save notes" },
        );
        if (!notes.ok) {
          push(notes.errorMessage, "danger");
          return;
        }
      }
      push("Shoot plan ready", "success");
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function saveNotes() {
    if (!plan) return;
    setBusy(true);
    try {
      const result = await mutateJson(
        `/api/sessions/${shoot.id}/plan`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dayNotes }),
        },
        { action: "save notes" },
      );
      if (!result.ok) {
        push(result.errorMessage, "danger");
        return;
      }
      push("Notes saved", "success");
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-display text-2xl">Prep</h2>
        <Link
          href="/admin/prep"
          className="inline-flex min-h-11 items-center text-sm text-accent no-underline"
        >
          Library
        </Link>
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
          {plan ? "Refresh plan from template" : "Create plan"}
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
