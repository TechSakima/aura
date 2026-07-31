"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { useParams } from "next/navigation";
import { StudioMark } from "@/components/brand/StudioMark";
import { StudioHomepageView } from "@/components/public/StudioHomepageView";
import { PublicShell } from "@/components/shells/PublicShell";
import { Button, EmptyState, Field, Input, Label } from "@/components/ui";
import type { HomepagePayload } from "@/lib/homepage-payload";
import {
  resolveStudioThemePreset,
  studioThemeCssVars,
} from "@/lib/themes";
import type { StudioTheme } from "@/lib/types";

type GateBrand = {
  name: string;
  logoUrl?: string;
  theme?: StudioTheme;
};

export default function GalleryHomepagePage() {
  const params = useParams<{ slug: string }>();
  const [data, setData] = useState<HomepagePayload | null>(null);
  const [gate, setGate] = useState<GateBrand | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);

  const fontPreset =
    data?.studio.theme?.fontPreset || gate?.theme?.fontPreset;
  const themeStyle = useMemo(() => {
    const theme = data?.studio.theme || gate?.theme;
    const preset = resolveStudioThemePreset(theme);
    return studioThemeCssVars(preset, {
      fontPreset: theme?.fontPreset,
    }) as CSSProperties;
  }, [data?.studio.theme, gate?.theme]);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/public/homepage/${params.slug}`, {
      credentials: "same-origin",
    });
    const json = await res.json().catch(() => ({}));
    if (res.status === 401 && json.needsPassword) {
      setNeedsPassword(true);
      setGate(json.gate || null);
      setData(null);
      setLoading(false);
      return;
    }
    if (!res.ok) {
      setError(String(json.error || "Not found"));
      setLoading(false);
      return;
    }
    setNeedsPassword(false);
    setGate(null);
    setData(json as HomepagePayload);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [params.slug]);

  async function onPassword(e: FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setPending(true);
    const verify = await fetch(`/api/public/homepage/${params.slug}`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const j = await verify.json().catch(() => ({}));
    setPending(false);
    if (!verify.ok) {
      if (j.gate) setGate(j.gate);
      setPasswordError(String(j.error || "Wrong password"));
      return;
    }
    setPassword("");
    setNeedsPassword(false);
    setGate(null);
    setData(j as HomepagePayload);
  }

  if (error && !data) {
    return (
      <PublicShell style={themeStyle} fontPreset={fontPreset}>
        <EmptyState variant="error" title={error} />
      </PublicShell>
    );
  }

  if (needsPassword && !data) {
    const name = gate?.name || "Studio";
    return (
      <PublicShell style={themeStyle} fontPreset={fontPreset}>
        <form
          onSubmit={onPassword}
          className="mx-auto max-w-sm space-y-5 py-10 sm:py-16"
        >
          <StudioMark
            name={name}
            logoUrl={gate?.logoUrl}
            tone="dark"
            className="mb-2"
          />
          <h1 className="font-display text-3xl tracking-tight sm:text-4xl">
            Private site
          </h1>
          <p className="text-sm text-muted">Enter the password to continue.</p>
          <Field>
            <Label htmlFor="pw">Password</Label>
            <Input
              id="pw"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="min-h-11"
            />
          </Field>
          {passwordError ? (
            <p className="text-sm text-danger" role="alert">
              {passwordError}
            </p>
          ) : null}
          <Button
            type="submit"
            className="min-h-11 w-full"
            pending={pending}
            pendingLabel="Checking…"
          >
            Continue
          </Button>
        </form>
      </PublicShell>
    );
  }

  if (loading || !data) {
    return (
      <PublicShell style={themeStyle} fontPreset={fontPreset}>
        <EmptyState variant="loading" title="Loading…" />
      </PublicShell>
    );
  }

  return <StudioHomepageView data={data} />;
}
