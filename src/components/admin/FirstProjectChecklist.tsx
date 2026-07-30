"use client";

import { Badge, List, ListRow, Panel } from "@/components/ui";
import type { FirstProjectGuide } from "@/lib/first-project-guide";

/** Guided first booking — create → quote → contract → deposit (AURA-260). */
export function FirstProjectChecklist({ guide }: { guide: FirstProjectGuide }) {
  if (guide.complete || guide.total === 0) return null;

  return (
    <Panel variant="static" className="p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-display text-lg sm:text-xl">First project</h2>
          <p className="mt-0.5 text-sm text-muted">
            {guide.projectName
              ? `${guide.projectName} — quote, contract, deposit`
              : "Create a project, then quote, contract, and deposit"}
          </p>
        </div>
        <p className="text-xs text-muted tabular-nums">
          {guide.done}/{guide.total}
        </p>
      </div>
      <List className="mt-3 border-x-0">
        {guide.items.map((item) => (
          <ListRow key={item.id} href={item.href} className="gap-x-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">{item.label}</p>
              <p className="mt-0.5 text-xs text-muted">{item.detail}</p>
            </div>
            <Badge
              tone={item.done ? "success" : "neutral"}
              className="shrink-0"
            >
              {item.done ? "Done" : "Open"}
            </Badge>
          </ListRow>
        ))}
      </List>
    </Panel>
  );
}
