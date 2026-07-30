"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FirstProjectChecklist } from "@/components/admin/FirstProjectChecklist";
import {
  Badge,
  Button,
  EmptyState,
  List,
  ListRow,
  MetricTile,
  PageHeader,
  Panel,
  SectionIntro,
} from "@/components/ui";
import {
  ADMIN_RESUME_ONCE_KEY,
  readAdminLastRoute,
} from "@/lib/admin-last-route";
import type { FirstProjectGuide } from "@/lib/first-project-guide";
import { useDisplayModeStandalone } from "@/lib/use-display-mode-standalone";

type Dash = {
  studio: { name: string; brandTagline?: string; timeZone?: string };
  counts: Record<string, number>;
  firstProjectGuide?: FirstProjectGuide | null;
  upcomingSession: {
    id: string;
    projectId: string;
    projectName: string;
    type: string;
    startsAt?: string;
    helperHref: string;
    projectHref: string;
  } | null;
  awaitingProposals: { id: string; title: string; token: string; projectHref: string }[];
  expiringGalleries: {
    id: string;
    title: string;
    expiresAt: string;
    publicToken: string;
    adminHref: string;
  }[];
  archiveFlags: { id: string; title: string; expiresAt: string; adminHref: string }[];
  recentContacts: {
    id: string;
    name: string;
    email: string;
    source: string;
    context?: string;
    preview: string;
    createdAt: string;
    projectId?: string;
    projectHref?: string;
  }[];
  deliveryIssues?: {
    kind: "email" | "calendar" | "payments";
    title: string;
    body: string;
    href: string;
  }[];
};

const COUNT_LABELS: Record<string, string> = {
  projects: "Projects",
  sessions: "Sessions",
  quotes: "Quotes",
  galleries: "Galleries",
};

export default function AdminDashboard() {
  const router = useRouter();
  const standalone = useDisplayModeStandalone();
  const [data, setData] = useState<Dash | null>(null);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const r = await fetch("/api/dashboard");
      const json = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(String(json.error || "Could not load dashboard"));
        setData(null);
        return;
      }
      setData(json as Dash);
    } catch {
      setError("Could not load dashboard");
      setData(null);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  // Installed app: cold start_url is Dashboard — resume last useful route once (AURA-296).
  useEffect(() => {
    if (!standalone) return;
    try {
      if (sessionStorage.getItem(ADMIN_RESUME_ONCE_KEY)) return;
      sessionStorage.setItem(ADMIN_RESUME_ONCE_KEY, "1");
    } catch {
      return;
    }
    const last = readAdminLastRoute();
    if (!last || last === "/admin" || last.startsWith("/admin?")) return;
    router.replace(last);
  }, [standalone, router]);

  useEffect(() => {
    if (!data) return;
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#messages") return;
    requestAnimationFrame(() => {
      document.getElementById("messages")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [data]);

  if (error && !data) {
    return (
      <EmptyState
        variant="error"
        title={error}
        action={<Button onClick={() => void load()}>Retry</Button>}
      />
    );
  }

  if (!data) {
    return <EmptyState variant="loading" title="Loading dashboard…" />;
  }

  const upcomingLabel = data.upcomingSession?.startsAt
    ? new Date(data.upcomingSession.startsAt).toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  const guide = data.firstProjectGuide;

  return (
    <div className="space-y-12">
      <PageHeader title="Dashboard" />

      {guide ? <FirstProjectChecklist guide={guide} /> : null}

      {(data.deliveryIssues || []).length > 0 ? (
        <section className="space-y-5">
          <SectionIntro eyebrow="Attention" title="Delivery issues" />
          <List>
            {(data.deliveryIssues || []).map((issue) => (
              <ListRow key={issue.kind}>
                <div className="min-w-0">
                  <p className="font-medium">{issue.title}</p>
                  <p className="mt-0.5 truncate text-sm text-muted">
                    {issue.body}
                  </p>
                </div>
                <Link
                  href={issue.href}
                  className="inline-flex min-h-11 shrink-0 items-center text-sm text-accent no-underline"
                >
                  Open
                </Link>
              </ListRow>
            ))}
          </List>
        </section>
      ) : null}

      {data.upcomingSession ? (
        <Panel as="section" className="px-6 py-8">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">
            Next session
          </p>
          <h2 className="mt-2 font-display text-3xl tracking-tight">
            {data.upcomingSession.projectName}
          </h2>
          <p className="mt-1 text-muted">
            {data.upcomingSession.type}
            {upcomingLabel ? ` · ${upcomingLabel}` : ""}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={data.upcomingSession.helperHref}>
              <Button size="lg">Open shoot day</Button>
            </Link>
            <Link href={data.upcomingSession.projectHref}>
              <Button size="lg" tone="neutral">
                Open project
              </Button>
            </Link>
          </div>
        </Panel>
      ) : guide ? null : (
        <Panel variant="dashed" as="section" className="px-6 py-8">
          <p className="text-sm text-muted">
            No upcoming sessions. Add a session date on a project to see it here.
          </p>
        </Panel>
      )}

      <section className="grid gap-6 border-b border-line pb-10 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(data.counts).map(([key, value]) => (
          <MetricTile
            key={key}
            label={COUNT_LABELS[key] || key}
            value={value}
          />
        ))}
      </section>

      <section id="messages" className="scroll-mt-24 space-y-5">
        <SectionIntro eyebrow="Inbox" title="Messages" />
        {(data.recentContacts || []).length === 0 ? (
          <EmptyState variant="inline" title="No messages yet." />
        ) : (
          <List>
            {(data.recentContacts || []).map((m) => (
              <ListRow key={m.id}>
                <div className="min-w-0">
                  <p className="font-medium">{m.name}</p>
                  <p className="mt-0.5 truncate text-sm text-muted">
                    {m.source}
                    {m.context ? ` · ${m.context}` : ""}
                    {m.preview ? ` — ${m.preview}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                  {m.projectHref ? (
                    <a
                      className="inline-flex min-h-11 items-center text-sm text-muted no-underline hover:text-ink"
                      href={m.projectHref}
                    >
                      Project
                    </a>
                  ) : null}
                  <a
                    className="inline-flex min-h-11 items-center text-sm text-accent no-underline"
                    href={`mailto:${m.email}`}
                  >
                    Reply
                  </a>
                </div>
              </ListRow>
            ))}
          </List>
        )}
      </section>

      <div className="grid gap-12 lg:grid-cols-2">
        <section className="space-y-5">
          <SectionIntro
            eyebrow="Attention"
            title="Awaiting quote"
            description="Quotes waiting on acceptance."
          />
          {data.awaitingProposals.length === 0 ? (
            <EmptyState variant="inline" title="None right now." />
          ) : (
            <List>
              {data.awaitingProposals.map((p) => (
                <ListRow key={p.id}>
                  <span className="font-medium">{p.title}</span>
                  <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
                    <a
                      className="inline-flex min-h-11 items-center text-sm text-accent no-underline"
                      href={p.projectHref}
                    >
                      Continue workflow
                    </a>
                    <a
                      className="inline-flex min-h-11 items-center text-sm text-muted no-underline hover:text-ink"
                      href={`/p/${p.token}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Preview
                    </a>
                  </div>
                </ListRow>
              ))}
            </List>
          )}
        </section>

        <section className="space-y-5">
          <SectionIntro
            eyebrow="Delivery"
            title="Expiring soon"
            description="Galleries within seven days."
          />
          {data.expiringGalleries.length === 0 ? (
            <EmptyState variant="inline" title="No galleries due soon." />
          ) : (
            <List>
              {data.expiringGalleries.map((g) => (
                <ListRow key={g.id}>
                  <div>
                    <span className="font-medium">{g.title}</span>
                    <Badge className="ml-2">
                      {new Date(g.expiresAt).toLocaleDateString()}
                    </Badge>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
                    <a
                      className="inline-flex min-h-11 items-center text-sm text-accent no-underline"
                      href={g.adminHref}
                    >
                      Open delivery
                    </a>
                    <a
                      className="inline-flex min-h-11 items-center text-sm text-muted no-underline hover:text-ink"
                      href={`/g/${g.publicToken}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Preview
                    </a>
                  </div>
                </ListRow>
              ))}
            </List>
          )}
        </section>

        <section className="space-y-5 lg:col-span-2">
          <SectionIntro
            eyebrow="Wrap"
            title="Expired — ready to archive"
            description="Past expiry; archive from Wrap when done."
          />
          {data.archiveFlags.length === 0 ? (
            <EmptyState variant="inline" title="None right now." />
          ) : (
            <List>
              {data.archiveFlags.map((g) => (
                <ListRow key={g.id}>
                  <div>
                    <span className="font-medium">{g.title}</span>
                    <Badge className="ml-2">
                      {new Date(g.expiresAt).toLocaleDateString()}
                    </Badge>
                  </div>
                  <a
                    className="inline-flex min-h-11 items-center text-sm text-accent no-underline"
                    href={g.adminHref}
                  >
                    Open delivery
                  </a>
                </ListRow>
              ))}
            </List>
          )}
        </section>
      </div>
    </div>
  );
}
