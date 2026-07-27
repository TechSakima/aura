"use client";

import { useState } from "react";
import { PackagesPanel } from "@/components/admin/PackagesPanel";
import { ShotListsPanel } from "@/components/admin/ShotListsPanel";
import { PageHeader, Tabs } from "@/components/ui";

export default function PrepPage() {
  const [tab, setTab] = useState("shots");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Library"
        title="Prep"
        description="Shot lists and quote packages for projects. Bookable offerings live under Bookings → Session types."
      />
      <Tabs
        tabs={[
          { id: "shots", label: "Shot lists" },
          { id: "packages", label: "Quote packages" },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "shots" ? <ShotListsPanel embedded /> : null}
      {tab === "packages" ? <PackagesPanel embedded /> : null}
    </div>
  );
}
