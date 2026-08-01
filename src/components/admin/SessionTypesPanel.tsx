"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Button,
  Card,
  Checkbox,
  Field,
  Input,
  Label,
  Select,
  useConfirm,
  useToast,
} from "@/components/ui";
import {
  clampBufferMinutes,
  DEFAULT_BUFFER_MINUTES,
} from "@/lib/booking-defaults";
import { formatSessionDuration, toDurationMinutes } from "@/lib/session-duration";
import type {
  SessionDurationUnit,
  SessionPricingMode,
  SessionType,
} from "@/lib/types";

export function SessionTypesPanel() {
  const { push } = useToast();
  const { confirm } = useConfirm();
  const [types, setTypes] = useState<SessionType[]>([]);
  const [qTemplates, setQTemplates] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [showArchivedTypes, setShowArchivedTypes] = useState(false);
  const [name, setName] = useState("Portrait session");
  const [duration, setDuration] = useState("60");
  const [durationUnit, setDurationUnit] =
    useState<SessionDurationUnit>("minutes");
  const [bufferMinutes, setBufferMinutes] = useState(
    String(DEFAULT_BUFFER_MINUTES),
  );
  const [price, setPrice] = useState("250");
  const [pricingMode, setPricingMode] =
    useState<SessionPricingMode>("after_intake");
  const [depositAmount, setDepositAmount] = useState("");
  const [questionnaireTemplateId, setQuestionnaireTemplateId] = useState("");
  const [creatingType, setCreatingType] = useState(false);
  const [savingTypeId, setSavingTypeId] = useState<string | null>(null);
  const [bufferDrafts, setBufferDrafts] = useState<Record<string, string>>({});

  async function load() {
    const [typesRes, studioRes] = await Promise.all([
      fetch("/api/bookings/session-types?view=requests"),
      fetch("/api/studio"),
    ]);
    if (!typesRes.ok) {
      push("Could not load session types", "danger");
      return;
    }
    const data = await typesRes.json();
    setTypes(data.sessionTypes || []);
    setQTemplates(data.questionnaireTemplates || []);
    if (studioRes.ok) {
      const studioData = await studioRes.json();
      const def = clampBufferMinutes(
        studioData.studio?.bookingDefaults?.defaultBufferMinutes,
      );
      setBufferMinutes(String(def));
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setCreatingType(true);
    const res = await fetch("/api/bookings/session-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        durationValue: Number(duration),
        durationUnit,
        bufferMinutes: clampBufferMinutes(bufferMinutes),
        basePrice: Number(price),
        pricingMode,
        depositAmount: depositAmount ? Number(depositAmount) : undefined,
        questionnaireTemplateId: questionnaireTemplateId || undefined,
      }),
    });
    setCreatingType(false);
    if (!res.ok) {
      push("Failed", "danger");
      return;
    }
    push("Session type created", "success");
    setDepositAmount("");
    void load();
  }

  async function patchType(
    typeId: string,
    body: Record<string, unknown>,
    okMessage = "Session type updated",
  ) {
    setSavingTypeId(typeId);
    const res = await fetch("/api/bookings/session-types", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: typeId, ...body }),
    });
    setSavingTypeId(null);
    if (!res.ok) {
      push("Could not update session type", "danger");
      return false;
    }
    push(okMessage, "success");
    await load();
    return true;
  }

  async function updateTypeQuestionnaire(
    typeId: string,
    nextTemplateId: string,
  ) {
    await patchType(typeId, {
      questionnaireTemplateId: nextTemplateId || null,
    });
  }

  async function saveTypeBuffer(typeId: string, raw: string) {
    const next = clampBufferMinutes(raw);
    setBufferDrafts((prev) => {
      const copy = { ...prev };
      delete copy[typeId];
      return copy;
    });
    const current = types.find((t) => t.id === typeId);
    if (current && clampBufferMinutes(current.bufferMinutes) === next) return;
    await patchType(typeId, { bufferMinutes: next }, "Buffer updated");
  }

  async function setTypeActive(typeId: string, active: boolean) {
    if (!active) {
      const ok = await confirm({
        title: "Archive session type?",
        message:
          "It will leave the public booking form. Existing bookings stay as they are.",
        confirmLabel: "Archive",
        tone: "danger",
      });
      if (!ok) return;
    }
    setSavingTypeId(typeId);
    const res = await fetch("/api/bookings/session-types", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: typeId, active }),
    });
    setSavingTypeId(null);
    if (!res.ok) {
      push("Could not update session type", "danger");
      return;
    }
    push(active ? "Session type restored" : "Session type archived", "success");
    void load();
  }

  const activeTypes = types.filter((t) => t.active !== false);
  const archivedTypes = types.filter((t) => t.active === false);

  return (
    <div id="types" className="scroll-mt-[var(--admin-scroll-mt)] space-y-10">
      <Card className="max-w-lg p-5">
        <h2 className="mb-1 font-display text-2xl">New session type</h2>
        <p className="mb-4 text-sm text-muted">
          Bookable offerings on your public form.
        </p>
        <form onSubmit={onCreate} className="space-y-4">
          <Field>
            <Label htmlFor="st-name">Name</Label>
            <Input
              id="st-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Field>
          <Field>
            <Label htmlFor="st-duration">Duration</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="st-duration"
                type="number"
                min={1}
                step={durationUnit === "minutes" ? 15 : 1}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="flex-1"
              />
              <Select
                aria-label="Duration unit"
                value={durationUnit}
                onChange={(e) => {
                  const next = e.target.value as SessionDurationUnit;
                  const mins = toDurationMinutes(Number(duration), durationUnit);
                  setDurationUnit(next);
                  if (next === "minutes") setDuration(String(mins));
                  else if (next === "hours")
                    setDuration(String(Math.max(1, Math.round(mins / 60))));
                  else
                    setDuration(
                      String(Math.max(1, Math.round(mins / (60 * 24)))),
                    );
                }}
                className="w-full sm:w-32"
              >
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </Select>
            </div>
          </Field>
          <Field>
            <Label htmlFor="st-buffer">Buffer (minutes)</Label>
            <Input
              id="st-buffer"
              inputMode="numeric"
              value={bufferMinutes}
              onChange={(e) =>
                setBufferMinutes(e.target.value.replace(/\D/g, "").slice(0, 3))
              }
            />
            <p className="mt-1 text-xs text-muted">
              Padding around booked times on the calendar.
            </p>
          </Field>
          <Field>
            <Label htmlFor="st-price">Base price ($)</Label>
            <Input
              id="st-price"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </Field>
          <Field>
            <Label htmlFor="st-pricing">Pricing</Label>
            <Select
              id="st-pricing"
              value={pricingMode}
              onChange={(e) =>
                setPricingMode(e.target.value as SessionPricingMode)
              }
            >
              <option value="after_intake">Quote after intake</option>
              <option value="upfront">Show price on booking form</option>
            </Select>
          </Field>
          <Field>
            <Label htmlFor="st-deposit">Deposit ($)</Label>
            <Input
              id="st-deposit"
              type="number"
              min={0}
              step="1"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="Optional"
            />
          </Field>
          <Field>
            <Label htmlFor="st-q">Questionnaire</Label>
            <Select
              id="st-q"
              value={questionnaireTemplateId}
              onChange={(e) => setQuestionnaireTemplateId(e.target.value)}
            >
              <option value="">None</option>
              {qTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
            {qTemplates.length === 0 ? (
              <p className="mt-1 text-xs text-muted">
                Create templates under Documents.
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted">
                Sent automatically when you confirm a booking.
              </p>
            )}
          </Field>
          <Button
            type="submit"
            className="min-h-11 w-full sm:w-auto"
            pending={creatingType}
            pendingLabel="Creating…"
          >
            Create
          </Button>
        </form>
      </Card>

      <section>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-display text-2xl">Your session types</h2>
          {archivedTypes.length > 0 ? (
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-muted">
              <Checkbox
                checked={showArchivedTypes}
                onChange={(e) => setShowArchivedTypes(e.target.checked)}
              />
              Show archived ({archivedTypes.length})
            </label>
          ) : null}
        </div>
        <ul className="space-y-3 sm:space-y-0 sm:divide-y sm:divide-line sm:border-y sm:border-line">
          {activeTypes.map((t) => (
            <li
              key={t.id}
              className="border border-line bg-surface p-4 text-sm sm:border-0 sm:bg-transparent sm:p-0 sm:py-3"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium">{t.name}</p>
                  <p className="text-muted">
                    {formatSessionDuration(t.durationMinutes)} · ${t.basePrice}
                    {t.pricingMode === "upfront"
                      ? " · upfront"
                      : " · after intake"}
                    {t.depositAmount != null
                      ? ` · deposit $${t.depositAmount}`
                      : ""}
                    {` · buffer ${clampBufferMinutes(t.bufferMinutes)}m`}
                  </p>
                </div>
                <Button
                  type="button"
                  tone="ghost"
                  className="min-h-11 shrink-0"
                  pending={savingTypeId === t.id}
                  onClick={() => void setTypeActive(t.id, false)}
                >
                  Archive
                </Button>
              </div>
              <div className="mt-3 grid gap-3 sm:max-w-sm">
                <Field>
                  <Label htmlFor={`st-buf-${t.id}`}>Buffer (minutes)</Label>
                  <Input
                    id={`st-buf-${t.id}`}
                    inputMode="numeric"
                    disabled={savingTypeId === t.id}
                    value={
                      bufferDrafts[t.id] ??
                      String(clampBufferMinutes(t.bufferMinutes))
                    }
                    onChange={(e) =>
                      setBufferDrafts((prev) => ({
                        ...prev,
                        [t.id]: e.target.value.replace(/\D/g, "").slice(0, 3),
                      }))
                    }
                    onBlur={() => {
                      const raw =
                        bufferDrafts[t.id] ??
                        String(clampBufferMinutes(t.bufferMinutes));
                      void saveTypeBuffer(t.id, raw);
                    }}
                  />
                </Field>
                <Field>
                  <Label htmlFor={`st-q-${t.id}`}>Questionnaire</Label>
                  <Select
                    id={`st-q-${t.id}`}
                    value={t.questionnaireTemplateId || ""}
                    disabled={savingTypeId === t.id}
                    onChange={(e) =>
                      void updateTypeQuestionnaire(t.id, e.target.value)
                    }
                  >
                    <option value="">None</option>
                    {qTemplates.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </li>
          ))}
          {showArchivedTypes
            ? archivedTypes.map((t) => (
                <li
                  key={t.id}
                  className="border border-line bg-surface p-4 text-sm sm:border-0 sm:bg-transparent sm:p-0 sm:py-3"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-muted">{t.name}</p>
                      <p className="text-muted">
                        Archived · not on booking form
                      </p>
                    </div>
                    <Button
                      type="button"
                      tone="neutral"
                      className="min-h-11 shrink-0"
                      pending={savingTypeId === t.id}
                      onClick={() => void setTypeActive(t.id, true)}
                    >
                      Restore
                    </Button>
                  </div>
                </li>
              ))
            : null}
          {activeTypes.length === 0 ? (
            <li className="py-4 text-sm text-muted">
              {archivedTypes.length > 0
                ? "No active types. Restore an archived one or create new."
                : "None yet."}
            </li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
