"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button, Field, Input, Label } from "@/components/ui";

type HomePayload = {
  studio: {
    name: string;
    logoUrl?: string;
    biography?: string;
    website?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  galleries: { title: string; token: string; coverPhotoUrl?: string }[];
};

export default function GalleryHomepagePage() {
  const params = useParams<{ slug: string }>();
  const [data, setData] = useState<HomePayload | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function load(pw?: string) {
    const q = pw ? `?password=${encodeURIComponent(pw)}` : "";
    const res = await fetch(`/api/public/homepage/${params.slug}${q}`);
    const json = await res.json();
    if (res.status === 401 && json.needsPassword) {
      setNeedsPassword(true);
      return;
    }
    if (!res.ok) {
      setError(json.error || "Not found");
      return;
    }
    setNeedsPassword(false);
    setData(json);
  }

  useEffect(() => {
    void load();
  }, [params.slug]);

  async function onPassword(e: FormEvent) {
    e.preventDefault();
    await load(password);
  }

  if (error && !data) {
    return <p className="shell-pad py-20 text-center text-muted">{error}</p>;
  }

  if (needsPassword && !data) {
    return (
      <form onSubmit={onPassword} className="shell-pad mx-auto max-w-sm py-20 space-y-4">
        <h1 className="font-display text-3xl">Enter password</h1>
        <Field>
          <Label htmlFor="pw">Homepage password</Label>
          <Input
            id="pw"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Button type="submit">Continue</Button>
      </form>
    );
  }

  if (!data) {
    return <p className="shell-pad py-20 text-center text-muted">Loading…</p>;
  }

  return (
    <div className="min-h-full bg-canvas text-ink">
      <header className="shell-pad mx-auto max-w-5xl py-16 text-center">
        {data.studio.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.studio.logoUrl}
            alt=""
            className="mx-auto mb-6 h-14 w-auto object-contain"
          />
        ) : null}
        <h1 className="font-display text-5xl tracking-tight">{data.studio.name}</h1>
        {data.studio.biography ? (
          <p className="mx-auto mt-4 max-w-xl text-muted">{data.studio.biography}</p>
        ) : null}
        <div className="mt-4 space-y-1 text-sm text-muted">
          {data.studio.email ? <p>{data.studio.email}</p> : null}
          {data.studio.phone ? <p>{data.studio.phone}</p> : null}
          {data.studio.website ? (
            <p>
              <a href={data.studio.website} className="text-accent">
                {data.studio.website}
              </a>
            </p>
          ) : null}
          {data.studio.address ? <p>{data.studio.address}</p> : null}
        </div>
      </header>
      <main className="shell-pad mx-auto grid max-w-5xl gap-6 pb-20 sm:grid-cols-2 lg:grid-cols-3">
        {data.galleries.map((g) => (
          <Link
            key={g.token}
            href={`/g/${g.token}`}
            className="group block no-underline"
          >
            <div className="aspect-[4/5] overflow-hidden bg-line">
              {g.coverPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={g.coverPhotoUrl}
                  alt=""
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                />
              ) : null}
            </div>
            <p className="mt-3 font-display text-xl text-ink">{g.title}</p>
          </Link>
        ))}
        {data.galleries.length === 0 ? (
          <p className="col-span-full text-center text-muted">No collections yet.</p>
        ) : null}
      </main>
    </div>
  );
}
