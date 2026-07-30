import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import type {
  InvoiceStatus,
  ProjectStage,
  SessionStatus,
} from "@/lib/types";

type Tone = "neutral" | "accent" | "success" | "danger";

type StatusMeta = { label: string; tone: Tone };

const PROJECT_STAGE: Record<string, StatusMeta> = {
  inquiry: { label: "Inquiry", tone: "accent" },
  booked: { label: "Booked", tone: "accent" },
  in_progress: { label: "In progress", tone: "accent" },
  delivered: { label: "Delivered", tone: "success" },
  completed: { label: "Completed", tone: "success" },
  canceled: { label: "Canceled", tone: "danger" },
  archived: { label: "Archived", tone: "neutral" },
};

const SESSION_STATUS: Record<string, StatusMeta> = {
  inquiry: { label: "Inquiry", tone: "accent" },
  proposed: { label: "Proposed", tone: "accent" },
  booked: { label: "Booked", tone: "accent" },
  delivered: { label: "Delivered", tone: "success" },
  archived: { label: "Archived", tone: "neutral" },
};

const INVOICE_STATUS: Record<string, StatusMeta> = {
  draft: { label: "Draft", tone: "neutral" },
  upcoming: { label: "Upcoming", tone: "accent" },
  past_due: { label: "Past due", tone: "danger" },
  paid: { label: "Paid", tone: "success" },
  canceled: { label: "Canceled", tone: "neutral" },
};

const BOOKING_REQUEST: Record<string, StatusMeta> = {
  pending: { label: "Pending", tone: "accent" },
  confirmed: { label: "Confirmed", tone: "success" },
  declined: { label: "Declined", tone: "danger" },
  canceled: { label: "Canceled", tone: "neutral" },
};

function labelize(value: string) {
  return value.replace(/_/g, " ");
}

function resolve(
  domain: "projectStage" | "sessionStatus" | "invoiceStatus" | "bookingRequest",
  value: string | null | undefined,
): StatusMeta {
  const raw = String(value || "").trim();
  if (!raw) return { label: "—", tone: "neutral" };
  const map =
    domain === "projectStage"
      ? PROJECT_STAGE
      : domain === "sessionStatus"
        ? SESSION_STATUS
        : domain === "invoiceStatus"
          ? INVOICE_STATUS
          : BOOKING_REQUEST;
  return map[raw] || { label: labelize(raw), tone: "neutral" };
}

type StatusBadgeProps = {
  className?: string;
} & (
  | { domain: "projectStage"; value: ProjectStage | string | null | undefined }
  | { domain: "sessionStatus"; value: SessionStatus | string | null | undefined }
  | { domain: "invoiceStatus"; value: InvoiceStatus | string | null | undefined }
  | {
      domain: "bookingRequest";
      value: "pending" | "confirmed" | "declined" | "canceled" | string | null | undefined;
    }
);

/** Domain-mapped status chip (AURA-216). */
export function StatusBadge({ domain, value, className }: StatusBadgeProps) {
  const { label, tone } = resolve(domain, value);
  return (
    <Badge tone={tone} className={cn(className)}>
      {label}
    </Badge>
  );
}
