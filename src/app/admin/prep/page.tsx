"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PackagesPanel } from "@/components/admin/PackagesPanel";
import { ShotListsPanel } from "@/components/admin/ShotListsPanel";
import { ButtonLink, EmptyState, PageHeader, Tabs } from "@/components/ui";

type PrepTab = "shots" | "packages";

function parseTab(raw: string | null): PrepTab {
  return raw === "packages" ? "packages" : "shots";
}

function PrepPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseTab(searchParams.get("tab"));

  function setTab(next: string) {
    const id = parseTab(next);
    router.replace(id === "shots" ? "/admin/prep?tab=shots" : "/admin/prep?tab=packages");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Studio"
        title="Library"
        actions={
          <ButtonLink
            href="/admin/settings/booking#types"
            tone="ghost"
            className="min-h-11"
          >
            Session types
          </ButtonLink>
        }
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

export default function PrepPage() {
  return (
    <Suspense
      fallback={<EmptyState variant="loading" title="Loading library…" />}
    >
      <PrepPageInner />
    </Suspense>
  );
}
