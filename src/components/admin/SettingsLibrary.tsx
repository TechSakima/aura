"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  Field,
  Label,
  List,
  ListRow,
  Panel,
  Select,
  useToast,
} from "@/components/ui";
import { useUnsavedChangesGuard } from "@/lib/hooks/use-unsaved-changes";
import type { ContractTemplate } from "@/lib/types";

type LibraryItem = {
  id: string;
  label: string;
  detail: string;
  href: string;
  count: number | null;
};

const LIBRARY_ITEMS: LibraryItem[] = [
  {
    id: "contracts",
    label: "Contracts",
    detail: "Templates and cancel policy",
    href: "/admin/documents#contract-templates",
    count: null,
  },
  {
    id: "questionnaires",
    label: "Questionnaires",
    detail: "Intake templates",
    href: "/admin/documents#questionnaires",
    count: null,
  },
  {
    id: "packages",
    label: "Quote packages",
    detail: "Pricing packages for quotes",
    href: "/admin/packages",
    count: null,
  },
  {
    id: "shot-lists",
    label: "Shot lists",
    detail: "Session shot list templates",
    href: "/admin/shot-lists",
    count: null,
  },
  {
    id: "watermarks",
    label: "Watermarks",
    detail: "Delivery watermark presets",
    href: "/admin/settings/delivery#watermarks",
    count: null,
  },
];

export function SettingsLibrary() {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [items, setItems] = useState<LibraryItem[]>(LIBRARY_ITEMS);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [defaultContractTemplateId, setDefaultContractTemplateId] =
    useState("");
  useUnsavedChangesGuard(dirty);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [contractsRes, qRes, packagesRes, shotsRes, studioRes] =
        await Promise.all([
          fetch("/api/documents/contracts"),
          fetch("/api/documents/questionnaires"),
          fetch("/api/packages"),
          fetch("/api/shot-lists"),
          fetch("/api/studio"),
        ]);
      if (cancelled) return;
      setLoading(false);

      const contractsData = contractsRes.ok
        ? await contractsRes.json().catch(() => ({}))
        : {};
      const tmpls = (contractsData.templates || []) as ContractTemplate[];
      setTemplates(tmpls);

      const qCount = qRes.ok
        ? ((await qRes.json().catch(() => ({}))).templates || []).length
        : null;
      const packageCount = packagesRes.ok
        ? ((await packagesRes.json().catch(() => ({}))).packages || []).length
        : null;
      const shotCount = shotsRes.ok
        ? ((await shotsRes.json().catch(() => ({}))).templates || []).length
        : null;
      const studioData = studioRes.ok
        ? await studioRes.json().catch(() => ({}))
        : {};
      const watermarkCount = studioRes.ok
        ? (studioData.watermarkPresets || []).length
        : null;

      const preferred = String(
        studioData.studio?.legalDefaults?.defaultContractTemplateId || "",
      );
      setDefaultContractTemplateId(
        preferred && tmpls.some((t) => t.id === preferred)
          ? preferred
          : tmpls[0]?.id || "",
      );
      setDirty(false);

      if (!contractsRes.ok && !qRes.ok && !packagesRes.ok) {
        push("Could not load library counts", "danger");
      }

      const counts: Record<string, number | null> = {
        contracts: contractsRes.ok ? tmpls.length : null,
        questionnaires: qCount,
        packages: packageCount,
        "shot-lists": shotCount,
        watermarks: watermarkCount,
      };
      setItems(
        LIBRARY_ITEMS.map((item) => ({
          ...item,
          count: counts[item.id] ?? null,
        })),
      );

      if (
        typeof window !== "undefined" &&
        window.location.hash === "#legal"
      ) {
        requestAnimationFrame(() => {
          document.getElementById("legal")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [push]);

  async function saveLegal(e?: FormEvent) {
    e?.preventDefault();
    setSaving(true);
    const res = await fetch("/api/studio", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: "library",
        legalDefaults: {
          defaultContractTemplateId: defaultContractTemplateId || null,
        },
      }),
    });
    setSaving(false);
    if (!res.ok) {
      push("Save failed", "danger");
      return;
    }
    setDirty(false);
    push("Legal defaults saved", "success");
  }

  if (loading) {
    return <EmptyState variant="loading" title="Loading library…" />;
  }

  const selected = templates.find((t) => t.id === defaultContractTemplateId);

  return (
    <div className="space-y-4">
      <Panel variant="static" className="min-w-0 p-5">
        <h2 className="font-display text-2xl">Library</h2>
        <p className="mt-1 text-sm text-muted">
          Templates and presets. Send from Documents or a project.
        </p>
        <List className="mt-4 border-x-0">
          {items.map((item) => (
            <ListRow key={item.id} href={item.href} className="gap-x-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">{item.label}</p>
                <p className="mt-0.5 text-xs text-muted">{item.detail}</p>
              </div>
              <Badge
                tone={item.count && item.count > 0 ? "success" : "neutral"}
                className="shrink-0"
              >
                {item.count == null
                  ? "Open"
                  : item.count === 0
                    ? "Empty"
                    : String(item.count)}
              </Badge>
            </ListRow>
          ))}
        </List>
      </Panel>

      <Card id="legal" className="min-w-0 scroll-mt-24 p-5">
        <h2 className="font-display text-2xl">Legal defaults</h2>
        <p className="mt-1 text-sm text-muted">
          Default contract for new sends.
        </p>

        {templates.length === 0 ? (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-muted">No contract templates yet.</p>
            <ButtonLink
              href="/admin/documents#contract-templates"
              tone="accent"
              className="w-full sm:w-auto"
            >
              Create contract template
            </ButtonLink>
          </div>
        ) : (
          <form onSubmit={saveLegal} className="mt-6 space-y-6">
            <Field>
              <Label htmlFor="legal-default-template">
                Default contract template
              </Label>
              <Select
                id="legal-default-template"
                value={defaultContractTemplateId}
                onChange={(e) => {
                  setDefaultContractTemplateId(e.target.value);
                  setDirty(true);
                }}
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
              {selected?.cancelPolicy ? (
                <p className="mt-1 text-xs text-muted">
                  Cancel policy
                  {selected.cancelPolicy.untilPayment
                    ? " · until payment"
                    : ""}
                  {selected.cancelPolicy.daysBeforeSession != null
                    ? ` · ${selected.cancelPolicy.daysBeforeSession}d before session`
                    : ""}
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted">
                  Cancel policy is set on the template.
                </p>
              )}
            </Field>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                type="submit"
                pending={saving}
                pendingLabel="Saving…"
                className="w-full sm:w-auto"
              >
                Save legal
              </Button>
              <ButtonLink
                href="/admin/documents#contract-templates"
                tone="ghost"
                className="w-full sm:w-auto"
              >
                Edit templates
              </ButtonLink>
              <ButtonLink
                href="/admin/packages"
                tone="ghost"
                className="w-full sm:w-auto"
              >
                Quote packages
              </ButtonLink>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
