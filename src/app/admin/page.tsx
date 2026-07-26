"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Button, PageHeader, SectionIntro } from "@/components/ui";


type Dash = {
  studio: { name: string; brandTagline?: string };
  counts: Record<string, number>;
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
  clients: "Clients",
  shoots: "Shoots",
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

  return (
    <div className="space-y-12">
      <PageHeader
        title="Dashboard"
        description="Quotes waiting, galleries closing, and work to wrap."
      />

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
                    <p className="font-medium">{g.title}</p>
                    <p className="text-sm text-muted">
                      Expires {new Date(g.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      className="text-sm text-accent"
                      href={`/g/${g.publicToken}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View
                    </a>
                    <Badge tone="accent">Soon</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-5 lg:col-span-2">
          <SectionIntro
            eyebrow="Wrap"
            title="Archive queue"
            description="Expired galleries ready to close out."
          />
          {data.archiveFlags.length === 0 ? (
            <p className="text-sm text-muted">Nothing waiting to archive.</p>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {data.archiveFlags.map((g) => (
                <li
                  key={g.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-4"
                >
                  <div>
                    <p className="font-medium">{g.title}</p>
                    <p className="text-sm text-muted">
                      Expired {new Date(g.expiresAt).toLocaleString()}
                    </p>
                  </div>
                  <Link href={`/admin/galleries/${g.id}`}>
                    <Button size="sm" tone="danger">
                      Review & archive
                    </Button>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
