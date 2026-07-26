"use client";

import { useEffect, useState } from "react";
import {
  IntakeListEditor,
  PricingListEditor,
  StringListEditor,
} from "@/components/admin/ListEditor";
import {
  Button,
  Card,
  Field,
  Input,
  Label,
  PageHeader,
  Textarea,
  useConfirm,
  useToast,
} from "@/components/ui";
import type { PackageTemplate } from "@/lib/types";

export function PackagesPanel({ embedded = false }: { embedded?: boolean }) {
  const { push } = useToast();
  const { confirm } = useConfirm();
  const [packages, setPackages] = useState<PackageTemplate[]>([]);
  const [editing, setEditing] = useState<PackageTemplate | null>(null);

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
    const res = await fetch(`/api/packages/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    if (!res.ok) {
      push("Save failed", "danger");
      return;
    }
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
          }
          description="Defaults for pricing, terms, inclusions, and intake questions."
        />
      ) : (
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl">Packages</h2>
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
              <Card className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium">{pkg.name}</p>
                  <p className="text-sm text-muted">
                    {pkg.defaultPricing.length} tiers · {pkg.intakeQuestions.length}{" "}
                    questions
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" tone="ghost" onClick={() => setEditing(pkg)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    tone="ghost"
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
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </Field>
            <Field>
              <Label htmlFor="terms">Contract terms</Label>
              <Textarea
                id="terms"
                value={editing.contractTerms}
                onChange={(e) =>
                  setEditing({ ...editing, contractTerms: e.target.value })
                }
              />
            </Field>
            <StringListEditor
              label="Inclusions"
              values={editing.inclusions}
              onChange={(inclusions) => setEditing({ ...editing, inclusions })}
              placeholder="Add inclusion"
            />
            <PricingListEditor
              tiers={editing.defaultPricing}
              onChange={(defaultPricing) =>
                setEditing({ ...editing, defaultPricing })
              }
            />
            <IntakeListEditor
              questions={editing.intakeQuestions}
              onChange={(intakeQuestions) =>
                setEditing({ ...editing, intakeQuestions })
              }
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void save()}>Save</Button>
              <Button tone="ghost" onClick={() => setEditing(null)}>
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
