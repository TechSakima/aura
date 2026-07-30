"use client";

import { useEffect, useState } from "react";
import {
  IntakeListEditor,
  PricingListEditor,
  StringListEditor,
} from "@/components/admin/ListEditor";
import {
  Button,
  ButtonLink,
  Card,
  Field,
  Input,
  Label,
  PageHeader,
  Textarea,
  useConfirm,
  useToast,
} from "@/components/ui";
import { useUnsavedChangesGuard } from "@/lib/hooks/use-unsaved-changes";
import type { PackageTemplate } from "@/lib/types";

export function PackagesPanel({ embedded = false }: { embedded?: boolean }) {
  const { push } = useToast();
  const { confirm } = useConfirm();
  const [packages, setPackages] = useState<PackageTemplate[]>([]);
  const [editing, setEditing] = useState<PackageTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [editDirty, setEditDirty] = useState(false);
  useUnsavedChangesGuard(editDirty);

  async function load() {
    const res = await fetch("/api/packages");
    if (!res.ok) {
      push("Could not load packages", "danger");
      return;
    }
    const data = await res.json();
    setPackages(data.packages || []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    if (!editing) return;
    setSaving(true);
    const res = await fetch(`/api/packages/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    setSaving(false);
    if (!res.ok) {
      push("Save failed", "danger");
      return;
    }
    setEditDirty(false);
    push("Package saved", "success");
    setPackages((prev) =>
      prev.map((p) => (p.id === editing.id ? editing : p)),
    );
    setEditing(null);
  }

  async function removePackage(pkg: PackageTemplate) {
    const ok = await confirm({
      title: "Delete package?",
      message: `“${pkg.name}” will be removed. This cannot be undone.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/packages/${pkg.id}`, { method: "DELETE" });
    if (!res.ok) {
      push("Delete failed", "danger");
      return;
    }
    push("Package deleted", "success");
    if (editing?.id === pkg.id) setEditing(null);
    setPackages((prev) => prev.filter((p) => p.id !== pkg.id));
  }

  return (
    <div>
      {!embedded ? (
        <PageHeader
          title="Package templates"
          actions={
            <>
              <ButtonLink
                href="/admin/settings/booking#types"
                tone="ghost"
                className="min-h-11"
              >
                Session types
              </ButtonLink>
              <Button
                onClick={async () => {
                  const res = await fetch("/api/packages", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      name: "New package",
                      contractTerms: "",
                      inclusions: ["Online gallery for 60 days"],
                      defaultPricing: [
                        {
                          id: crypto.randomUUID(),
                          name: "Standard",
                          price: 0,
                          description: "Customize this tier",
                          highlighted: true,
                        },
                      ],
                      intakeQuestions: [],
                    }),
                  });
                  if (!res.ok) {
                    push("Create failed", "danger");
                    return;
                  }
                  push("Package created", "success");
                  await load();
                }}
              >
                New package
              </Button>
            </>
          }
        />
      ) : (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h2 className="font-display text-2xl">Quote packages</h2>
            <ButtonLink
              href="/admin/settings/booking#types"
              tone="ghost"
              size="sm"
              className="min-h-11"
            >
              Session types
            </ButtonLink>
          </div>
          <Button
            size="sm"
            onClick={async () => {
              const res = await fetch("/api/packages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: "New package",
                  contractTerms: "",
                  inclusions: ["Online gallery for 60 days"],
                  defaultPricing: [
                    {
                      id: crypto.randomUUID(),
                      name: "Standard",
                      price: 0,
                      description: "Customize this tier",
                      highlighted: true,
                    },
                  ],
                  intakeQuestions: [],
                }),
              });
              if (!res.ok) {
                push("Create failed", "danger");
                return;
              }
              await load();
            }}
          >
            New package
          </Button>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <ul className="space-y-3">
          {packages.map((pkg) => (
            <li key={pkg.id}>
              <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium">{pkg.name}</p>
                  <p className="text-sm text-muted">
                    {pkg.defaultPricing.length} tiers · {pkg.intakeQuestions.length}{" "}
                    questions
                  </p>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:shrink-0">
                  <Button
                    size="sm"
                    tone="ghost"
                    className="min-h-11 w-full sm:w-auto"
                    onClick={() => setEditing(pkg)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    tone="ghost"
                    className="min-h-11 w-full sm:w-auto"
                    onClick={() => void removePackage(pkg)}
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>

        {editing ? (
          <Card className="space-y-4 p-5">
            <h2 className="font-display text-2xl">Edit {editing.name}</h2>
            <Field>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={editing.name}
                onChange={(e) => {
                  setEditing({ ...editing, name: e.target.value });
                  setEditDirty(true);
                }}
              />
            </Field>
            <Field>
              <Label htmlFor="terms">Quote terms</Label>
              <Textarea
                id="terms"
                value={editing.contractTerms}
                onChange={(e) => {
                  setEditing({ ...editing, contractTerms: e.target.value });
                  setEditDirty(true);
                }}
              />
              <p className="mt-1 text-xs text-muted">
                Shown on quotes. Signing agreements use Documents templates.
              </p>
            </Field>
            <StringListEditor
              label="Inclusions"
              values={editing.inclusions}
              onChange={(inclusions) => {
                setEditing({ ...editing, inclusions });
                setEditDirty(true);
              }}
              placeholder="Add inclusion"
            />
            <PricingListEditor
              tiers={editing.defaultPricing}
              onChange={(defaultPricing) => {
                setEditing({ ...editing, defaultPricing });
                setEditDirty(true);
              }}
            />
            <IntakeListEditor
              label="Intake questions"
              questions={editing.intakeQuestions}
              onChange={(intakeQuestions) => {
                setEditing({ ...editing, intakeQuestions });
                setEditDirty(true);
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                pending={saving}
                pendingLabel="Saving…"
                onClick={() => void save()}
              >
                Save
              </Button>
              <Button
                tone="ghost"
                onClick={() => {
                  setEditing(null);
                  setEditDirty(false);
                }}
              >
                Cancel
              </Button>
              <Button
                tone="danger"
                onClick={() => void removePackage(editing)}
              >
                Delete package
              </Button>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
