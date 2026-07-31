"use client";

import { Badge, List, ListRow, Panel } from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  deliveryPublishDoneCount,
  type DeliveryPublishItem,
} from "@/lib/delivery-publish";

/** One panel for Delivery go-live steps (AURA-255). Hidden when complete. */
export function DeliveryPublishChecklist({
  items,
  onAction,
  /** Sheet / compact host provides the title (AURA-442). */
  bare = false,
}: {
  items: DeliveryPublishItem[];
  onAction: (action: DeliveryPublishItem["action"]) => void;
  bare?: boolean;
}) {
  const { done, total, complete } = deliveryPublishDoneCount(items);
  if (complete || total === 0) return null;

  const list = (
    <List className={cn(!bare && "mt-3", "border-x-0")}>
      {items.map((item) => (
        <ListRow
          key={item.id}
          className="gap-x-3"
          onClick={() => onAction(item.action)}
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink">{item.label}</p>
            <p className="mt-0.5 text-xs text-muted">{item.detail}</p>
          </div>
          <Badge
            tone={item.done ? "success" : "neutral"}
            className="shrink-0"
          >
            {item.done ? "Done" : "Next"}
          </Badge>
        </ListRow>
      ))}
    </List>
  );

  if (bare) {
    return (
      <div>
        <p className="mb-2 text-xs text-muted">
          {done}/{total}
        </p>
        {list}
      </div>
    );
  }

  return (
    <Panel variant="static" className="p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg">Publish checklist</h2>
        <p className="text-xs text-muted">
          {done}/{total}
        </p>
      </div>
      {list}
    </Panel>
  );
}
