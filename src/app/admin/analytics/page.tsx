"use client";

import { useEffect, useState } from "react";
import {
  Card,
  Field,
  Label,
  PageHeader,
  SectionIntro,
  Select,
} from "@/components/ui";

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
  }[];
};

type Analytics = {
  totals: Record<string, number>;
  byDay: Record<string, number>;
  topPhotos: { photoId: string; count: number; thumbUrl?: string }[];
  recent: { id: string; type: string; at: string; photoId?: string }[];
  financials: Financials;
};

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [shoots, setShoots] = useState<{ id: string; type: string }[]>([]);
  const [shootId, setShootId] = useState("");

  useEffect(() => {
    void fetch("/api/shoots")
      .then((r) => r.json())
      .then((d) => setShoots(d.shoots || []));
  }, []);

  useEffect(() => {
    const q = shootId ? `?shootId=${encodeURIComponent(shootId)}` : "";
    void fetch(`/api/analytics${q}`)
      .then((r) => r.json())
      .then(setData);
  }, [shootId]);

  if (!data) return <p className="text-muted">Loading analytics…</p>;

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
        <Label htmlFor="shoot">Filter by shoot</Label>
        <Select
          id="shoot"
          value={shootId}
          onChange={(e) => setShootId(e.target.value)}
        >
          <option value="">All shoots</option>
          {shoots.map((s) => (
            <option key={s.id} value={s.id}>
              {s.type} ({s.id.slice(0, 6)})
            </option>
          ))}
        </Select>
      </Field>

      <section className="mb-10 space-y-5">
        <SectionIntro title="Financials" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4">
            <p className="text-sm text-muted">Collected (net)</p>
            <p className="font-display text-3xl">{money(f.collectedNet)}</p>
            <p className="mt-1 text-xs text-muted">
              {f.transactionCount} payment{f.transactionCount === 1 ? "" : "s"}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted">Client paid (gross)</p>
            <p className="font-display text-3xl">{money(f.collectedGross)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted">Processing fees</p>
            <p className="font-display text-3xl">{money(f.processingFees)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted">Open invoices</p>
            <p className="font-display text-3xl">{money(f.openInvoiceNet)}</p>
            <p className="mt-1 text-xs text-muted">
              {f.openInvoiceCount} outstanding
            </p>
          </Card>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h3 className="mb-3 text-sm font-medium text-muted">
              Revenue by day
            </h3>
            {Object.keys(f.byDay).length === 0 ? (
              <p className="border-y border-line py-4 text-sm text-muted">
                No payments yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {Object.entries(f.byDay)
                  .sort(([a], [b]) => b.localeCompare(a))
                  .slice(0, 14)
                  .map(([day, amount]) => (
                    <li key={day}>
                      <Card className="flex justify-between p-3 text-sm">
                        <span>{day}</span>
                        <span>{money(amount)}</span>
                      </Card>
                    </li>
                  ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="mb-3 text-sm font-medium text-muted">
              Recent payments
            </h3>
            {f.recent.length === 0 ? (
              <p className="border-y border-line py-4 text-sm text-muted">
                No payments yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {f.recent.map((t) => (
                  <li key={t.id}>
                    <Card className="p-3 text-sm">
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
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <SectionIntro title="Engagement" className="mb-5" />

      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(data.totals).map(([key, value]) => (
          <Card key={key} className="p-4">
            <p className="text-sm text-muted">{key.replace(/_/g, " ")}</p>
            <p className="font-display text-3xl">{value}</p>
          </Card>
        ))}
        {Object.keys(data.totals).length === 0 ? (
          <p className="text-sm text-muted sm:col-span-2">No engagement yet.</p>
        ) : null}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 font-display text-2xl">Activity by day</h2>
          <ul className="space-y-2">
            {Object.entries(data.byDay)
              .sort(([a], [b]) => b.localeCompare(a))
              .slice(0, 14)
              .map(([day, count]) => (
                <li key={day}>
                  <Card className="flex justify-between p-3 text-sm">
                    <span>{day}</span>
                    <span>{count}</span>
                  </Card>
                </li>
              ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-3 font-display text-2xl">Top photos</h2>
          <ul className="grid grid-cols-2 gap-3">
            {data.topPhotos.map((p) => (
              <li key={p.photoId}>
                <Card className="overflow-hidden p-2">
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
                </Card>
              </li>
            ))}
          </ul>
        </section>

        <section className="lg:col-span-2">
          <h2 className="mb-3 font-display text-2xl">Recent events</h2>
          <ul className="space-y-2">
            {data.recent.map((e) => (
              <li key={e.id}>
                <Card className="flex flex-wrap justify-between gap-2 p-3 text-sm">
                  <span>{e.type}</span>
                  <span className="text-muted">
                    {new Date(e.at).toLocaleString()}
                  </span>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
