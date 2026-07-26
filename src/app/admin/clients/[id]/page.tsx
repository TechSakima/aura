"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ShootPublicLinks } from "@/components/admin/ShootPublicLinks";
import {
  Button,
  EmptyState,
  Field,
  Input,
  Label,
  PageHeader,
  SectionIntro,
  Textarea,
  useConfirm,
  useToast,
} from "@/components/ui";
import type { Client, Shoot } from "@/lib/types";
import { deriveWizardProgress } from "@/lib/wizard/steps";

type ShootRow = Shoot & {
  currentStep?: string;
  label?: string;
  quoteToken?: string;
  galleryToken?: string;
};

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { push } = useToast();
  const { confirm } = useConfirm();
  const [client, setClient] = useState<Client | null>(null);
  const [shoots, setShoots] = useState<ShootRow[]>([]);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [shootType, setShootType] = useState("Weddings");
  const [shootDate, setShootDate] = useState("");

  async function load() {
    const res = await fetch(`/api/clients/${id}`);
    if (!res.ok) {
      push("Client not found", "danger");
      router.push("/admin/clients");
      return;
    }
    const data = await res.json();
    setClient(data.client);
    setName(data.client.name);
    setEmail(data.client.email);
    setPhone(data.client.phone || "");
    setNotes(data.client.notes || "");

    const rows: ShootRow[] = [];
    for (const shoot of (data.shoots || []) as Shoot[]) {
      const wiz = await fetch(`/api/shoots/${shoot.id}/wizard`);
      if (wiz.ok) {
        const w = await wiz.json();
        const progress = deriveWizardProgress({
          shoot: w.shoot,
          proposal: w.proposal,
          plan: w.plan,
          gallery: w.gallery,
          photoCount: w.photoCount,
        });
        rows.push({
          ...shoot,
          currentStep: progress.currentStep,
          label: progress.currentStep.replace("-", " "),
          quoteToken: w.proposal?.token,
          galleryToken: w.gallery?.publicToken,
        });
      } else {
        rows.push(shoot);
      }
    }
    setShoots(rows);
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function saveClient(e: FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, notes }),
    });
    if (!res.ok) {
      push("Save failed", "danger");
      return;
    }
    const data = await res.json();
    setClient(data.client);
    setEditing(false);
    push("Client updated", "success");
  }

  async function createShoot(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/shoots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: id,
        type: shootType,
        shootDate: shootDate || undefined,
      }),
    });
    if (!res.ok) {
      push("Could not create shoot", "danger");
      return;
    }
    const data = await res.json();
    push("Shoot created — continue the workflow", "success");
    router.push(`/admin/clients/${id}/shoots/${data.shoot.id}?step=intake`);
  }

  async function deleteShoot(shoot: ShootRow) {
    const label = [shoot.type, shoot.shootDate].filter(Boolean).join(" · ");
    const ok = await confirm({
      title: "Delete shoot?",
      message: `“${label}” and its quote, plan, and gallery photos will be removed. This cannot be undone.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/shoots/${shoot.id}`, { method: "DELETE" });
    if (!res.ok) {
      push("Could not delete shoot", "danger");
      return;
    }
    push("Shoot deleted", "success");
    setShoots((prev) => prev.filter((s) => s.id !== shoot.id));
  }

  if (!client) return <p className="text-muted">Loading…</p>;

  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow="Client"
        title={client.name}
        description="Contact details and shoot workflows."
        actions={
          <Button tone="ghost" onClick={() => router.push("/admin/clients")}>
            All clients
          </Button>
        }
      />

      <section className="space-y-5">
        <SectionIntro
          title="Contact"
          actions={
            <Button tone="ghost" size="sm" onClick={() => setEditing((v) => !v)}>
              {editing ? "Cancel" : "Edit"}
            </Button>
          }
        />
        {editing ? (
          <form onSubmit={saveClient} className="max-w-lg space-y-4">
            <Field>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
            <Field>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Field>
            <Field>
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <Field>
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            <Button type="submit">Save</Button>
          </form>
        ) : (
          <dl className="grid gap-4 border-y border-line py-5 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted">Email</dt>
              <dd className="mt-1">{client.email}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted">Phone</dt>
              <dd className="mt-1">{client.phone || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted">Notes</dt>
              <dd className="mt-1">{client.notes || "—"}</dd>
            </div>
          </dl>
        )}
      </section>

      <section className="space-y-5">
        <SectionIntro
          title="New shoot"
          description="Start a workflow for booking through delivery."
        />
        <form onSubmit={createShoot} className="grid max-w-3xl gap-4 sm:grid-cols-3">
          <Field>
            <Label>Type</Label>
            <Input value={shootType} onChange={(e) => setShootType(e.target.value)} required />
          </Field>
          <Field>
            <Label>Date</Label>
            <Input type="date" value={shootDate} onChange={(e) => setShootDate(e.target.value)} />
          </Field>
          <div className="flex items-end">
            <Button type="submit" className="w-full">
              Start workflow
            </Button>
          </div>
        </form>
      </section>

      <section className="space-y-5">
        <SectionIntro title="Shoots" />
        {shoots.length === 0 ? (
          <EmptyState
            title="No shoots yet"
            description="Start a workflow to move from intake through delivery."
          />
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {shoots.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 py-5"
              >
                <div className="min-w-0">
                  <p className="font-display text-xl">{s.type}</p>
                  <p className="text-sm text-muted">
                    {s.shootDate || "Date TBD"} · {s.status}
                    {s.label ? ` · Next: ${s.label}` : ""}
                  </p>
                  <ShootPublicLinks
                    className="mt-3"
                    quoteToken={s.quoteToken}
                    galleryToken={s.galleryToken}
                  />
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Link
                    href={`/admin/clients/${id}/shoots/${s.id}${
                      s.currentStep ? `?step=${s.currentStep}` : ""
                    }`}
                  >
                    <Button size="sm">Continue</Button>
                  </Link>
                  <Button
                    size="sm"
                    tone="ghost"
                    onClick={() => void deleteShoot(s)}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
