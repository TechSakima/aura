"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Button,
  EmptyState,
  Field,
  Label,
  List,
  ListRow,
  MetricTile,
  PageHeader,
  Panel,
  SectionIntro,
  Select,
} from "@/components/ui";
import { analyticsEventLabel } from "@/lib/analytics-labels";

type Financials = {
  collectedNet: number;
  collectedGross: number;
  processingFees: number;
  transactionCount: number;
  openInvoiceNet: number;
  openInvoiceCount: number;
  paidInvoiceNet: number;
  byDay: Record<string, number>;
  recent: {
    id: string;
    netAmount: number;
    grossAmount: number;
    processingFee: number;
    projectName?: string;
    createdAt: string;
    href?: string;
  }[];
};

type Analytics = {
  totals: Record<string, number>;
  byDay: Record<string, number>;
  topPhotos: {
    photoId: string;
    count: number;
    thumbUrl?: string;
    href?: string;
  }[];
  recent: {
    id: string;
    type: string;
    at: string;
    photoId?: string;
    projectName?: string;
    href?: string;
  }[];
  financials: Financials;
};

type SessionOption = {
  id: string;
  type: string;
  projectId: string;
  startsAt?: string;
};

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

function sessionOptionLabel(
  session: SessionOption,
  projectName?: string,
): string {
  const date = session.startsAt?.slice(0, 10);
  return [projectName || "Project", session.type, date]
    .filter(Boolean)
    .join(" · ");
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState("");
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [projectNames, setProjectNames] = useState<Record<string, string>>({});
  const [sessionId, setSessionId] = useState("");

  useEffect(() => {
    void fetch("/api/sessions")
      .then((r) => r.json())
      .then((d) => {
        setSessions(d.sessions || []);
        const names: Record<string, string> = {};
        for (const p of d.projects || []) {
          if (p?.id) names[p.id] = p.name || "Project";
        }
        setProjectNames(names);
      });
  }, []);

  const sessionOptions = [...sessions].sort((a, b) =>
    (b.startsAt || "").localeCompare(a.startsAt || ""),
  );

  async function loadAnalytics() {
    setError("");
    try {
      const q = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : "";
      const r = await fetch(`/api/analytics${q}`);
      const json = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(String(json.error || "Could not load analytics"));
        setData(null);
        return;
      }
      setData(json as Analytics);
    } catch {
      setError("Could not load analytics");
      setData(null);
    }
  }

  useEffect(() => {
    void loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  if (error && !data) {
    return (
      <EmptyState
        variant="error"
        title={error}
        action={<Button onClick={() => void loadAnalytics()}>Retry</Button>}
      />
    );
  }

  if (!data) {
    return <EmptyState variant="loading" title="Loading analytics…" />;
  }

  const f = data.financials ?? {
    collectedNet: 0,
    collectedGross: 0,
    processingFees: 0,
    transactionCount: 0,
    openInvoiceNet: 0,
    openInvoiceCount: 0,
    paidInvoiceNet: 0,
    byDay: {},
    recent: [],
  };

  return (
    <div>
      <PageHeader
        eyebrow="Insights"
        title="Analytics"
        description="Engagement and payments across your studio."
      />
      <Field className="mb-6 max-w-sm">
        <Label htmlFor="session">Filter by session</Label>
        <Select
          id="session"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
        >
          <option value="">All sessions</option>
          {sessionOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {sessionOptionLabel(s, projectNames[s.projectId])}
            </option>
          ))}
        </Select>
      </Field>

      <section className="mb-10 space-y-5">
        <SectionIntro title="Financials" />
        <div className="grid gap-6 border-b border-line pb-8 sm:grid-cols-2 lg:grid-cols-4">
          <MetricTile
            label="Collected (net)"
            value={money(f.collectedNet)}
            hint={`${f.transactionCount} payment${f.transactionCount === 1 ? "" : "s"}`}
          />
          <MetricTile
            label="Paid (gross)"
            value={money(f.collectedGross)}
          />
          <MetricTile
            label="Processing fees"
            value={money(f.processingFees)}
          />
          <MetricTile
            label="Open invoices"
            value={money(f.openInvoiceNet)}
            hint={`${f.openInvoiceCount} outstanding`}
          />
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h3 className="mb-3 text-sm font-medium text-muted">
              Revenue by day
            </h3>
            {Object.keys(f.byDay).length === 0 ? (
              <EmptyState
                variant="inline"
                title="No payments yet."
                className="border-y border-line py-4"
              />
            ) : (
              <List>
                {Object.entries(f.byDay)
                  .sort(([a], [b]) => b.localeCompare(a))
                  .slice(0, 14)
                  .map(([day, amount]) => (
                    <ListRow key={day} className="text-sm">
                      <span>{day}</span>
                      <span>{money(amount)}</span>
                    </ListRow>
                  ))}
              </List>
            )}
          </div>
          <div>
            <h3 className="mb-3 text-sm font-medium text-muted">
              Recent payments
            </h3>
            {f.recent.length === 0 ? (
              <EmptyState
                variant="inline"
                title="No payments yet."
                className="border-y border-line py-4"
              />
            ) : (
              <List>
                {f.recent.map((t) => (
                  <ListRow key={t.id} href={t.href} className="items-start">
                    <div className="min-w-0 text-sm">
                      <div className="flex flex-wrap justify-between gap-2">
                        <span className="font-medium">
                          {money(t.netAmount)} net
                        </span>
                        <span className="text-muted">
                          {new Date(t.createdAt).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <p className="mt-1 text-muted">
                        Paid {money(t.grossAmount)} · fee{" "}
                        {money(t.processingFee)}
                        {t.projectName ? ` · ${t.projectName}` : ""}
                      </p>
                    </div>
                  </ListRow>
                ))}
              </List>
            )}
          </div>
        </div>
      </section>

      <SectionIntro title="Engagement" className="mb-5" />

      <div className="mb-8 grid gap-6 border-b border-line pb-8 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(data.totals).map(([key, value]) => (
          <MetricTile
            key={key}
            label={analyticsEventLabel(key)}
            value={value}
          />
        ))}
        {Object.keys(data.totals).length === 0 ? (
          <EmptyState
            variant="inline"
            title="No engagement yet."
            className="sm:col-span-2"
          />
        ) : null}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 font-display text-2xl">Activity by day</h2>
          {Object.keys(data.byDay).length === 0 ? (
            <EmptyState
              variant="inline"
              title="No activity yet."
              className="border-y border-line py-4"
            />
          ) : (
            <List>
              {Object.entries(data.byDay)
                .sort(([a], [b]) => b.localeCompare(a))
                .slice(0, 14)
                .map(([day, count]) => (
                  <ListRow key={day} className="text-sm">
                    <span>{day}</span>
                    <span>{count}</span>
                  </ListRow>
                ))}
            </List>
          )}
        </section>

        <section>
          <h2 className="mb-3 font-display text-2xl">Top photos</h2>
          {data.topPhotos.length === 0 ? (
            <EmptyState
              variant="inline"
              title="No photo events yet."
              className="border-y border-line py-4"
            />
          ) : (
            <ul className="grid grid-cols-2 gap-3">
              {data.topPhotos.map((p) => {
                const body = (
                  <Panel
                    variant="interactive"
                    className="overflow-hidden p-2"
                  >
                    {p.thumbUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.thumbUrl}
                        alt=""
                        className="aspect-square w-full object-cover"
                      />
                    ) : (
                      <div className="aspect-square bg-line/50" />
                    )}
                    <p className="mt-2 text-sm text-muted">{p.count} events</p>
                  </Panel>
                );
                return (
                  <li key={p.photoId}>
                    {p.href ? (
                      <Link
                        href={p.href}
                        className="block no-underline text-inherit"
                      >
                        {body}
                      </Link>
                    ) : (
                      body
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="lg:col-span-2">
          <h2 className="mb-3 font-display text-2xl">Recent events</h2>
          {data.recent.length === 0 ? (
            <EmptyState
              variant="inline"
              title="No events yet."
              className="border-y border-line py-4"
            />
          ) : (
            <List>
              {data.recent.map((e) => (
                <ListRow key={e.id} href={e.href} className="items-start text-sm">
                  <div className="min-w-0">
                    <span className="font-medium">
                      {analyticsEventLabel(e.type)}
                    </span>
                    {e.projectName ? (
                      <p className="mt-0.5 text-muted">{e.projectName}</p>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-muted">
                    {new Date(e.at).toLocaleString()}
                  </span>
                </ListRow>
              ))}
            </List>
          )}
        </section>
      </div>
    </div>
  );
}
