"use client";

import { FormEvent, useEffect, useState } from "react";
import { ShotItemsEditor } from "@/components/admin/ListEditor";
import {
  Button,
  Card,
  Field,
  Input,
  Label,
  PageHeader,
  Select,
  useToast,
} from "@/components/ui";
import { normalizeShotCategory } from "@/lib/shots";
import type { ShotListTemplate } from "@/lib/types";

function withCategories(template: ShotListTemplate): ShotListTemplate {
  return {
    ...template,
    items: template.items.map((item) => {
      const category = normalizeShotCategory(item.category || item.section);
      return { ...item, category, section: category };
    }),
  };
}

export function ShotListsPanel({ embedded = false }: { embedded?: boolean }) {
  const { push } = useToast();
  const [templates, setTemplates] = useState<ShotListTemplate[]>([]);
  const [editing, setEditing] = useState<ShotListTemplate | null>(null);
  const [name, setName] = useState("Custom list");
  const [shootType, setShootType] = useState("Weddings");

  async function load() {
    const res = await fetch("/api/shot-lists");
    if (!res.ok) {
      push("Could not load shot lists", "danger");
      return;
    }
    const data = await res.json();
    setTemplates(data.templates || []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/shot-lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, shootType }),
    });
    if (!res.ok) {
      push("Create failed", "danger");
      return;
    }
    push("Template created", "success");
    await load();
  }

  async function saveEdit() {
    if (!editing) return;
    const res = await fetch(`/api/shot-lists/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    if (!res.ok) {
      push("Save failed", "danger");
      return;
    }
    push("Template saved", "success");
    setTemplates((prev) =>
      prev.map((t) => (t.id === editing.id ? editing : t)),
    );
    setEditing(null);
  }

  async function uploadImage(file: File): Promise<string | null> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/uploads/reference", {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      push("Image upload failed", "danger");
      return null;
    }
    const data = await res.json();
    return data.url ? String(data.url) : null;
  }

  return (
    <div>
      {!embedded ? (
        <PageHeader
          title="Shot library"
          description="Studio templates for prep and the shoot-day helper. Add shots with category, name, and optional reference photo — then attach a list to a session."
        />
      ) : (
        <h2 className="mb-4 font-display text-2xl">Shot lists</h2>
      )}
      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-4 font-display text-xl">New template</h3>
          <form onSubmit={onCreate} className="space-y-4">
            <Field>
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field>
              <Label htmlFor="type">Shoot type</Label>
              <Select
                id="type"
                value={shootType}
                onChange={(e) => setShootType(e.target.value)}
              >
                <option>Weddings</option>
                <option>Maternity</option>
                <option>Mini-Sessions</option>
                <option>Other</option>
              </Select>
            </Field>
            <Button type="submit">Create</Button>
          </form>

          <ul className="mt-6 space-y-2">
            {templates.map((t) => (
              <li key={t.id}>
                <Card className="flex items-center justify-between gap-2 p-3">
                  <div>
                    <p className="font-medium">{t.name}</p>
                    <p className="text-sm text-muted">
                      {t.shootType} · {t.items.length} shots
                    </p>
                  </div>
                  <Button
                    size="sm"
                    tone="ghost"
                    onClick={() => setEditing(withCategories(structuredClone(t)))}
                  >
                    Edit
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        </Card>

        {editing ? (
          <Card className="space-y-4 p-5">
            <h3 className="font-display text-xl">Edit {editing.name}</h3>
            <Field>
              <Label>Name</Label>
              <Input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </Field>
            <ShotItemsEditor
              items={editing.items}
              onChange={(items) => setEditing({ ...editing, items })}
              onUploadImage={uploadImage}
            />
            <div className="flex gap-2">
              <Button onClick={() => void saveEdit()}>Save</Button>
              <Button tone="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
