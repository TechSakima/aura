"use client";

import { useEffect, useState } from "react";
import {
  Badge,
  EmptyState,
  List,
  ListRow,
  Panel,
  useToast,
} from "@/components/ui";

type CheckItem = {
  id: string;
  label: string;
  detail: string;
  href: string;
  done: boolean;
};

export function SettingsOverview() {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CheckItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [studioRes, connectRes, typesRes] = await Promise.all([
        fetch("/api/studio"),
        fetch("/api/payments/connect"),
        fetch("/api/bookings/session-types"),
      ]);
      if (cancelled) return;
      setLoading(false);
      if (!studioRes.ok) {
        push("Could not load settings", "danger");
        return;
      }
      const data = await studioRes.json();
      const connect = connectRes.ok
        ? await connectRes.json()
        : { onboardingComplete: false };
      const typesData = typesRes.ok ? await typesRes.json() : { sessionTypes: [] };
      const studio = data.studio || {};
      const homepage = studio.homepage || {};
      const brandDone = Boolean(
        String(studio.name || "").trim() && studio.logoUrl,
      );
      const businessDone = Boolean(
        String(studio.website || "").trim() ||
          String(studio.phone || "").trim() ||
          String(studio.addressLine1 || "").trim() ||
          String(studio.city || "").trim(),
      );
      const connectDone = Boolean(connect.onboardingComplete);
      const calendarDone = Boolean(studio.googleCalendarConnected);
      const homepageDone = Boolean(homepage.enabled && homepage.slug);
      const delivery = studio.deliveryDefaults || {};
      const deliveryDone = Boolean(studio.defaultWatermarkPresetId);
      const sessionTypes = Array.isArray(typesData.sessionTypes)
        ? typesData.sessionTypes
        : [];
      const bookingDone = sessionTypes.some(
        (t: { active?: boolean }) => t.active !== false,
      );

      setItems([
        {
          id: "brand",
          label: "Brand",
          detail: brandDone
            ? "Studio name and logo set"
            : "Add studio name and logo",
          href: "/admin/settings/brand",
          done: brandDone,
        },
        {
          id: "business",
          label: "Business",
          detail: businessDone
            ? "Contact details set"
            : "Add phone, website, or address",
          href: "/admin/settings/business",
          done: businessDone,
        },
        {
          id: "website",
          label: "Website",
          detail: homepageDone
            ? `Live at /h/${homepage.slug}`
            : "Turn on website and set a URL",
          href: "/admin/settings/website",
          done: homepageDone,
        },
        {
          id: "booking",
          label: "Booking",
          detail: bookingDone
            ? "Session types ready"
            : "Add a bookable session type",
          href: "/admin/settings/booking#types",
          done: bookingDone,
        },
        {
          id: "delivery",
          label: "Delivery",
          detail: deliveryDone
            ? `${Number(delivery.expiryDays) || 60}-day expiry · watermark set`
            : "Set watermark and gallery defaults",
          href: "/admin/settings/delivery",
          done: deliveryDone,
        },
        {
          id: "payments",
          label: "Payments",
          detail: connectDone ? "Payouts ready" : "Enable card payments",
          href: "/admin/settings/payments",
          done: connectDone,
        },
        {
          id: "notifications",
          label: "Notifications",
          detail: "Email alerts and contact delivery",
          href: "/admin/settings/notifications",
          done: true,
        },
        {
          id: "calendar",
          label: "Calendar",
          detail: calendarDone ? "Calendar connected" : "Connect calendar",
          href: "/admin/settings/integrations",
          done: calendarDone,
        },
      ]);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [push]);

  if (loading) {
    return <EmptyState variant="loading" title="Loading overview…" />;
  }

  const setupItems = items.filter((i) => i.id !== "notifications");
  const doneCount = setupItems.filter((i) => i.done).length;

  return (
    <div className="space-y-6">
      <Panel variant="static" className="p-5">
        <h2 className="font-display text-2xl">Overview</h2>
        <p className="mt-1 text-sm text-muted">
          {doneCount}/{setupItems.length} ready
        </p>
        <List className="mt-4 border-x-0">
          {items.map((item) => (
            <ListRow key={item.id} href={item.href} className="gap-x-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">{item.label}</p>
                <p className="mt-0.5 text-xs text-muted">{item.detail}</p>
              </div>
              <Badge
                tone={item.done ? "success" : "neutral"}
                className="shrink-0"
              >
                {item.done ? "Done" : "Set up"}
              </Badge>
            </ListRow>
          ))}
        </List>
      </Panel>
    </div>
  );
}
