"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Button, PageHeader, SectionIntro } from "@/components/ui";

type Dash = {
  studio: { name: string; brandTagline?: string; timeZone?: string };
  counts: Record<string, number>;
  upcomingSession: {
    id: string;
    projectId: string;
    projectName: string;
    type: string;
    startsAt?: string;
    helperHref: string;
    projectHref: string;
  } | null;
  awaitingProposals: { id: string; title: string; token: string }[];
  expiringGalleries: {
    id: string;
    title: string;
    expiresAt: string;
    publicToken: string;
  }[];
  archiveFlags: { id: string; title: string; expiresAt: string }[];
};

const COUNT_LABELS: Record<string, string> = {
  projects: "Projects",
  sessions: "Sessions",
  quotes: "Quotes",
  galleries: "Galleries",
};

export default function AdminDashboard() {
  const [data, setData] = useState<Dash | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(() => undefined);
  }, []);

  if (!data) {
    return <p className="text-muted">Loading dashboard…</p>;
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

  return (
    <div className="space-y-12">
      <PageHeader
        title="Dashboard"
        description="Next session, quotes waiting, and galleries closing."
      />

      {data.upcomingSession ? (
        <section className="border border-line bg-surface px-6 py-8">
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
        </section>
      ) : (
        <section className="border border-dashed border-line px-6 py-8">
          <p className="text-sm text-muted">
            No upcoming sessions. Add a session date on a project to see it here.
          </p>
        </section>
      )}

      <section className="grid gap-6 border-b border-line pb-10 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(data.counts).map(([key, value]) => (
          <div key={key}>
            <p className="text-xs uppercase tracking-[0.16em] text-muted">
              {COUNT_LABELS[key] || key}
            </p>
            <p className="mt-2 font-display text-4xl tracking-tight">{value}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-12 lg:grid-cols-2">
        <section className="space-y-5">
          <SectionIntro
            eyebrow="Attention"
            title="Awaiting quote"
            description="Clients who haven’t accepted yet."
          />
          {data.awaitingProposals.length === 0 ? (
            <p className="text-sm text-muted">None right now.</p>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {data.awaitingProposals.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 py-4"
                >
                  <span className="font-medium">{p.title}</span>
                  <a
                    className="text-sm text-accent"
                    href={`/p/${p.token}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View quote
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-5">
          <SectionIntro
            eyebrow="Delivery"
            title="Expiring soon"
            description="Galleries within seven days."
          />
          {data.expiringGalleries.length === 0 ? (
            <p className="text-sm text-muted">No galleries due soon.</p>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {data.expiringGalleries.map((g) => (
                <li
                  key={g.id}
                  className="flex items-center justify-between gap-3 py-4"
                >
                  <div>
                    <span className="font-medium">{g.title}</span>
                    <Badge className="ml-2">
                      {new Date(g.expiresAt).toLocaleDateString()}
                    </Badge>
                  </div>
                  <a
                    className="text-sm text-accent"
                    href={`/g/${g.publicToken}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
