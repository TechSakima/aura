"use client";

import { Badge, List, ListRow, Panel } from "@/components/ui";
import {
  websiteReadinessDoneCount,
  type WebsiteReadinessItem,
} from "@/lib/website-readiness";

/** Gentle site go-live checklist — hidden when complete (AURA-236). */
export function WebsiteReadinessChecklist({
  items,
}: {
  items: WebsiteReadinessItem[];
}) {
  const { done, total, complete } = websiteReadinessDoneCount(items);
  if (complete || total === 0) return null;

  return (
    <Panel variant="static" className="p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg">Site checklist</h2>
        <p className="text-xs text-muted">
          {done}/{total}
        </p>
      </div>
      <List className="mt-3 border-x-0">
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
  );
}
