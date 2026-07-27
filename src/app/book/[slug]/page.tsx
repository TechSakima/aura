"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button, Field, Input, Label, Select } from "@/components/ui";
import type { SessionType } from "@/lib/types";

export default function PublicBookPage() {
  const params = useParams<{ slug: string }>();
  const [studioName, setStudioName] = useState("");
  const [types, setTypes] = useState<SessionType[]>([]);
  const [sessionTypeId, setSessionTypeId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/public/book/${params.slug}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else {
          setStudioName(d.studio.name);
          setTypes(d.sessionTypes || []);
          if (d.sessionTypes?.[0]) setSessionTypeId(d.sessionTypes[0].id);
        }
      });
  }, [params.slug]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/public/book/${params.slug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        sessionTypeId,
        startsAt: new Date(startsAt).toISOString(),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not book");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="shell-pad mx-auto max-w-md py-20 text-center">
        <h1 className="font-display text-3xl">Request received</h1>
        <p className="mt-2 text-muted">We’ll confirm your session shortly.</p>
      </div>
    );
  }

  return (
    <div className="shell-pad mx-auto max-w-md py-16">
      <h1 className="font-display text-4xl">{studioName || "Book"}</h1>
      <p className="mt-2 text-muted">Request a session.</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <Field>
          <Label htmlFor="type">Session type</Label>
          <Select
            id="type"
            value={sessionTypeId}
            onChange={(e) => setSessionTypeId(e.target.value)}
            required
          >
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.durationMinutes}m)
              </option>
            ))}
          </Select>
        </Field>
        <Field>
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
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
          <Label htmlFor="when">Preferred date & time</Label>
          <Input
            id="when"
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            required
          />
        </Field>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button type="submit" className="w-full">
          Request booking
        </Button>
      </form>
    </div>
  );
}
