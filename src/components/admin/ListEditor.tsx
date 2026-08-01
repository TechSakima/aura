"use client";

import {
  Button,
  Checkbox,
  Field,
  FileUploadButton,
  Input,
  Label,
  Panel,
  Select,
  Textarea,
  useUploadSession,
} from "@/components/ui";
import { SHOT_CATEGORIES } from "@/lib/shots";

export function StringListEditor({
  label,
  values,
  onChange,
  placeholder = "Add item",
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  return (
    <Field>
      <Label>{label}</Label>
      <div className="space-y-2">
        {values.map((v, i) => (
          <div
            key={i}
            className="flex min-w-0 flex-col gap-[var(--density-control-gap,0.5rem)] sm:flex-row"
          >
            <Input
              className="min-w-0 flex-1"
              value={v}
              onChange={(e) => {
                const next = [...values];
                next[i] = e.target.value;
                onChange(next);
              }}
            />
            <Button
              type="button"
              tone="ghost"
              className="min-h-11 w-full shrink-0 sm:w-auto"
              onClick={() => onChange(values.filter((_, j) => j !== i))}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          tone="neutral"
          className="min-h-11"
          onClick={() => onChange([...values, ""])}
        >
          {placeholder}
        </Button>
      </div>
    </Field>
  );
}

export function PartnerListEditor({
  partners,
  onChange,
}: {
  partners: { id: string; name: string; url: string; note: string }[];
  onChange: (
    next: { id: string; name: string; url: string; note: string }[],
  ) => void;
}) {
  return (
    <Field>
      <Label>Print partners</Label>
      <div className="space-y-4">
        {partners.map((p, i) => (
          <Panel key={p.id} className="space-y-3">
            <Field>
              <Label htmlFor={`partner-name-${p.id}`}>Name</Label>
              <Input
                id={`partner-name-${p.id}`}
                value={p.name}
                onChange={(e) => {
                  const next = [...partners];
                  next[i] = { ...p, name: e.target.value };
                  onChange(next);
                }}
              />
            </Field>
            <Field>
              <Label htmlFor={`partner-url-${p.id}`}>URL</Label>
              <Input
                id={`partner-url-${p.id}`}
                placeholder="https://"
                value={p.url}
                onChange={(e) => {
                  const next = [...partners];
                  next[i] = { ...p, url: e.target.value };
                  onChange(next);
                }}
              />
            </Field>
            <Field>
              <Label htmlFor={`partner-note-${p.id}`}>Note</Label>
              <Textarea
                id={`partner-note-${p.id}`}
                value={p.note}
                onChange={(e) => {
                  const next = [...partners];
                  next[i] = { ...p, note: e.target.value };
                  onChange(next);
                }}
              />
            </Field>
            <Button
              type="button"
              tone="ghost"
              className="min-h-11"
              onClick={() => onChange(partners.filter((_, j) => j !== i))}
            >
              Remove partner
            </Button>
          </Panel>
        ))}
        <Button
          type="button"
          tone="neutral"
          className="min-h-11"
          onClick={() =>
            onChange([
              ...partners,
              {
                id: crypto.randomUUID(),
                name: "",
                url: "",
                note: "",
              },
            ])
          }
        >
          Add partner
        </Button>
      </div>
    </Field>
  );
}

export type IntakeRow = {
  id: string;
  label: string;
  type: "text" | "textarea" | "select" | "date";
  required?: boolean;
  options?: string[];
};

export function IntakeListEditor({
  questions,
  onChange,
  label = "Questions",
}: {
  questions: IntakeRow[];
  onChange: (next: IntakeRow[]) => void;
  label?: string;
}) {
  return (
    <Field>
      <Label>{label}</Label>
      <div className="space-y-3">
        {questions.map((q, i) => (
          <Panel key={q.id} className="space-y-3">
            <Field>
              <Label htmlFor={`q-label-${q.id}`}>Question</Label>
              <Input
                id={`q-label-${q.id}`}
                value={q.label}
                onChange={(e) => {
                  const next = [...questions];
                  next[i] = { ...q, label: e.target.value };
                  onChange(next);
                }}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <Label htmlFor={`q-type-${q.id}`}>Type</Label>
                <Select
                  id={`q-type-${q.id}`}
                  value={q.type}
                  onChange={(e) => {
                    const next = [...questions];
                    next[i] = {
                      ...q,
                      type: e.target.value as IntakeRow["type"],
                    };
                    onChange(next);
                  }}
                >
                  <option value="text">Short text</option>
                  <option value="textarea">Long text</option>
                  <option value="select">Dropdown</option>
                  <option value="date">Date</option>
                </Select>
              </Field>
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <Checkbox
                  checked={Boolean(q.required)}
                  onChange={(e) => {
                    const next = [...questions];
                    next[i] = { ...q, required: e.target.checked };
                    onChange(next);
                  }}
                />
                Required
              </label>
            </div>
            {q.type === "select" ? (
              <Field>
                <Label htmlFor={`q-options-${q.id}`}>Options</Label>
                <Input
                  id={`q-options-${q.id}`}
                  placeholder="Comma-separated"
                  value={(q.options || []).join(", ")}
                  onChange={(e) => {
                    const next = [...questions];
                    next[i] = {
                      ...q,
                      options: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    };
                    onChange(next);
                  }}
                />
              </Field>
            ) : null}
            <Button
              type="button"
              tone="ghost"
              className="min-h-11"
              onClick={() => onChange(questions.filter((_, j) => j !== i))}
            >
              Remove
            </Button>
          </Panel>
        ))}
        <Button
          type="button"
          tone="neutral"
          className="min-h-11"
          onClick={() =>
            onChange([
              ...questions,
              {
                id: crypto.randomUUID(),
                label: "",
                type: "text",
                required: false,
              },
            ])
          }
        >
          Add question
        </Button>
      </div>
    </Field>
  );
}

export type TierRow = {
  id: string;
  name: string;
  price: number;
  description: string;
  highlighted?: boolean;
};

export function PricingListEditor({
  tiers,
  onChange,
}: {
  tiers: TierRow[];
  onChange: (next: TierRow[]) => void;
}) {
  return (
    <Field>
      <Label>Pricing tiers</Label>
      <div className="space-y-3">
        {tiers.map((t, i) => (
          <Panel key={t.id} className="space-y-3">
            <Field>
              <Label htmlFor={`tier-name-${t.id}`}>Name</Label>
              <Input
                id={`tier-name-${t.id}`}
                value={t.name}
                onChange={(e) => {
                  const next = [...tiers];
                  next[i] = { ...t, name: e.target.value };
                  onChange(next);
                }}
              />
            </Field>
            <Field>
              <Label htmlFor={`tier-price-${t.id}`}>Price ($)</Label>
              <Input
                id={`tier-price-${t.id}`}
                type="number"
                min={0}
                step="1"
                placeholder="Required"
                value={
                  Number.isFinite(t.price) && t.price > 0 ? t.price : ""
                }
                onChange={(e) => {
                  const raw = e.target.value;
                  const next = [...tiers];
                  next[i] = {
                    ...t,
                    price: raw === "" ? 0 : Number(raw) || 0,
                  };
                  onChange(next);
                }}
              />
            </Field>
            <Field>
              <Label htmlFor={`tier-desc-${t.id}`}>Description</Label>
              <Textarea
                id={`tier-desc-${t.id}`}
                value={t.description}
                onChange={(e) => {
                  const next = [...tiers];
                  next[i] = { ...t, description: e.target.value };
                  onChange(next);
                }}
              />
            </Field>
            <label className="inline-flex min-h-11 items-center gap-2 text-sm">
              <Checkbox
                checked={Boolean(t.highlighted)}
                onChange={(e) => {
                  const next = [...tiers];
                  next[i] = { ...t, highlighted: e.target.checked };
                  onChange(next);
                }}
              />
              Highlight this tier
            </label>
            <Button
              type="button"
              tone="ghost"
              className="min-h-11"
              onClick={() => onChange(tiers.filter((_, j) => j !== i))}
            >
              Remove tier
            </Button>
          </Panel>
        ))}
        <Button
          type="button"
          tone="neutral"
          className="min-h-11"
          onClick={() =>
            onChange([
              ...tiers,
              {
                id: crypto.randomUUID(),
                name: "Standard",
                price: 0,
                description: "",
              },
            ])
          }
        >
          Add tier
        </Button>
      </div>
    </Field>
  );
}

export type ShotItemRow = {
  id: string;
  category: string;
  label: string;
  mustHave: boolean;
  referenceImageUrl?: string;
  note?: string;
  section?: string;
};

export function ShotItemsEditor({
  items,
  onChange,
  onUploadImage,
}: {
  items: ShotItemRow[];
  onChange: (next: ShotItemRow[]) => void;
  onUploadImage?: (file: File) => Promise<string | null>;
}) {
  const uploadSession = useUploadSession();

  async function uploadExample(itemIndex: number, files: File[]) {
    if (!onUploadImage || !files[0]) return;
    const file = files[0];
    let url: string | null = null;
    await uploadSession.runUpload({
      title: "Uploading example",
      files: [file],
      uploadFile: async (f) => {
        url = await onUploadImage(f);
        if (!url) throw new Error("Upload failed");
      },
    });
    if (!url) return;
    const next = [...items];
    const item = next[itemIndex];
    if (!item) return;
    next[itemIndex] = { ...item, referenceImageUrl: url };
    onChange(next);
  }

  return (
    <Field>
      <Label>Shots / ideas</Label>
      {uploadSession.dialog}
      <div className="space-y-3">
        {items.map((item, i) => (
          <Panel key={item.id} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <Label htmlFor={`shot-cat-${item.id}`}>Category</Label>
                <Select
                  id={`shot-cat-${item.id}`}
                  value={item.category}
                  onChange={(e) => {
                    const next = [...items];
                    next[i] = {
                      ...item,
                      category: e.target.value,
                      section: e.target.value,
                    };
                    onChange(next);
                  }}
                >
                  {SHOT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  {!SHOT_CATEGORIES.includes(
                    item.category as (typeof SHOT_CATEGORIES)[number],
                  ) && item.category ? (
                    <option value={item.category}>{item.category}</option>
                  ) : null}
                </Select>
              </Field>
              <Field>
                <Label htmlFor={`shot-label-${item.id}`}>Name</Label>
                <Input
                  id={`shot-label-${item.id}`}
                  placeholder="Rings"
                  value={item.label}
                  onChange={(e) => {
                    const next = [...items];
                    next[i] = { ...item, label: e.target.value };
                    onChange(next);
                  }}
                />
              </Field>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {item.referenceImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.referenceImageUrl}
                  alt=""
                  className="h-14 w-14 rounded-md object-cover"
                />
              ) : null}
              {onUploadImage ? (
                <FileUploadButton
                  label={item.referenceImageUrl ? "Replace photo" : "Add photo"}
                  size="sm"
                  tone="neutral"
                  disabled={uploadSession.busy}
                  onFiles={(files) => void uploadExample(i, files)}
                />
              ) : null}
              <label className="inline-flex min-h-11 items-center gap-2 text-sm">
                <Checkbox
                  checked={item.mustHave}
                  onChange={(e) => {
                    const next = [...items];
                    next[i] = { ...item, mustHave: e.target.checked };
                    onChange(next);
                  }}
                />
                Must-have
              </label>
            </div>
            <Button
              type="button"
              tone="ghost"
              className="min-h-11"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
            >
              Remove shot
            </Button>
          </Panel>
        ))}
        <Button
          type="button"
          tone="neutral"
          className="min-h-11"
          onClick={() =>
            onChange([
              ...items,
              {
                id: crypto.randomUUID(),
                category: "Close-up",
                section: "Close-up",
                label: "",
                mustHave: false,
              },
            ])
          }
        >
          Add shot / idea
        </Button>
      </div>
    </Field>
  );
}
