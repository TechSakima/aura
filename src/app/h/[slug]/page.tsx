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
    socialLinks?: { label: string; url: string }[];
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
      <form
        onSubmit={onPassword}
        className="shell-pad mx-auto max-w-sm space-y-4 py-20"
      >
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

  const contactBits = [
    data.studio.email,
    data.studio.address,
    data.studio.phone,
  ].filter(Boolean);

  return (
    <div className="min-h-full bg-canvas text-ink">
      <header className="shell-pad mx-auto max-w-5xl py-16 text-center sm:py-20">
        {data.studio.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.studio.logoUrl}
            alt=""
            className="mx-auto mb-6 h-14 w-auto object-contain"
          />
        ) : null}
        <h1 className="font-sans text-4xl font-semibold uppercase tracking-[0.14em] sm:text-5xl">
          {data.studio.name}
        </h1>
        {data.studio.biography ? (
          <p className="mx-auto mt-5 max-w-xl text-muted">
            {data.studio.biography}
          </p>
        ) : null}
        {contactBits.length > 0 ? (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted">
            {data.studio.email ? <span>{data.studio.email}</span> : null}
            {data.studio.address ? <span>{data.studio.address}</span> : null}
            {data.studio.phone ? <span>{data.studio.phone}</span> : null}
          </div>
        ) : null}
        {data.studio.website ? (
          <p className="mt-3 text-sm">
            <a href={data.studio.website} className="text-accent">
              {data.studio.website.replace(/^https?:\/\//, "")}
            </a>
          </p>
        ) : null}
        {data.studio.socialLinks && data.studio.socialLinks.length > 0 ? (
          <ul className="mt-4 flex flex-wrap justify-center gap-4 text-sm">
            {data.studio.socialLinks.map((s) => (
              <li key={s.url}>
                <a href={s.url} className="text-accent">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </header>

      <main className="shell-pad mx-auto max-w-5xl pb-20">
        <div className="columns-1 gap-4 sm:columns-2 sm:gap-5 lg:columns-3">
          {data.galleries.map((g) => (
            <Link
              key={g.token}
              href={`/g/${g.token}`}
              className="mb-4 block break-inside-avoid no-underline sm:mb-5"
            >
              <div className="overflow-hidden bg-line">
                {g.coverPhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={g.coverPhotoUrl}
                    alt=""
                    className="h-auto w-full object-cover transition duration-500 hover:scale-[1.02]"
                  />
                ) : (
                  <div className="aspect-[4/5] bg-line" />
                )}
              </div>
              <p className="mt-3 font-sans text-sm font-medium uppercase tracking-[0.12em] text-ink">
                {g.title}
              </p>
            </Link>
          ))}
        </div>
        {data.galleries.length === 0 ? (
          <p className="text-center text-muted">No collections yet.</p>
        ) : null}
      </main>
    </div>
  );
}
