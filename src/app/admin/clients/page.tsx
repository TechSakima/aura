"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Label,
  PageHeader,
  Textarea,
  useToast,
} from "@/components/ui";
import type { Client } from "@/lib/types";

export default function ClientsPage() {
  const router = useRouter();
  const { push } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [q, setQ] = useState("");

  async function load() {
    const res = await fetch("/api/clients");
    if (!res.ok) {
      push("Could not load clients", "danger");
      return;
    }
    const data = await res.json();
    setClients(data.clients || []);
  }

  useEffect(() => {
    void load();
  }, []);

  function resetForm() {
    setName("");
    setEmail("");
    setPhone("");
    setNotes("");
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, notes }),
    });
    if (!res.ok) {
      push("Could not save client", "danger");
      return;
    }
    const data = await res.json();
    setClients((prev) => [data.client, ...prev]);
    resetForm();
    setAdding(false);
    push("Client saved — open them to start a shoot workflow", "success");
    router.push(`/admin/clients/${data.client.id}`);
  }

  const filtered = clients.filter((c) => {
    const s = q.toLowerCase();
    return (
      !s ||
      c.name.toLowerCase().includes(s) ||
      c.email.toLowerCase().includes(s) ||
      (c.phone || "").includes(s)
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Directory"
        title="Clients"
        description="Open a client to continue their shoot workflow."
        actions={
          adding ? (
            <Button
              tone="ghost"
              onClick={() => {
                setAdding(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
          ) : (
            <Button
              onClick={() => {
                setAdding(true);
                setQ("");
              }}
            >
              Add client
            </Button>
          )
        }
      />

      {adding ? (
        <Card className="mx-auto max-w-lg p-5">
          <h2 className="mb-4 font-display text-2xl">New client</h2>
          <form onSubmit={onCreate} className="space-y-4">
            <Field>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </Field>
            <Field>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Field>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Field>
            <Field>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button type="submit">Save client</Button>
              <Button
                type="button"
                tone="ghost"
                onClick={() => {
                  setAdding(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <>
          <Field className="max-w-md">
            <Label htmlFor="q">Search</Label>
            <Input
              id="q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name, email, phone"
            />
          </Field>
          {filtered.length === 0 ? (
            <EmptyState
              title={clients.length === 0 ? "No clients yet" : "No matches"}
              description={
                clients.length === 0
                  ? "Add your first contact to start a shoot workflow."
                  : "Try a different search."
              }
            />
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {filtered.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <Link
                      href={`/admin/clients/${c.id}`}
                      className="font-display text-xl text-ink no-underline hover:opacity-80"
                    >
                      {c.name}
                    </Link>
                    <p className="text-sm text-muted">{c.email}</p>
                  </div>
                  <Link href={`/admin/clients/${c.id}`}>
                    <Button size="sm" tone="neutral">
                      Open
                    </Button>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
