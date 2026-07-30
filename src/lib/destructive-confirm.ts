/**
 * Shared ConfirmProvider copy for irreversible / high-consequence actions (AURA-262).
 * Tone: danger = hard to reverse; accent = intentional publish; neutral = soft.
 */

export type DestructiveConfirmCopy = {
  title: string;
  message: string;
  confirmLabel: string;
  tone: "danger" | "accent" | "neutral";
};

export function confirmReplaceQuote(): DestructiveConfirmCopy {
  return {
    title: "Replace quote?",
    message:
      "The current client quote link stops working. A new link is created for this package.",
    confirmLabel: "Replace quote",
    tone: "danger",
  };
}

export function confirmRefreshPlan(): DestructiveConfirmCopy {
  return {
    title: "Refresh plan?",
    message:
      "Replaces the current shot list from the template. Checked-off shoot-day progress is lost.",
    confirmLabel: "Refresh plan",
    tone: "danger",
  };
}

export function confirmGoLive(galleryTitle: string): DestructiveConfirmCopy {
  const name = galleryTitle.trim() || "Gallery";
  return {
    title: "Go live?",
    message: `“${name}” becomes reachable on its public link. Clients can view and download per your settings.`,
    confirmLabel: "Go live",
    tone: "accent",
  };
}

export function confirmArchiveGallery(): DestructiveConfirmCopy {
  return {
    title: "Archive gallery?",
    message:
      "A zip downloads for your records. Photos are removed from the live gallery and the project may mark complete.",
    confirmLabel: "Archive",
    tone: "danger",
  };
}

export function confirmArchiveProject(name: string): DestructiveConfirmCopy {
  return {
    title: "Archive project?",
    message: `“${name}” leaves the default project list. You can unarchive later.`,
    confirmLabel: "Archive",
    tone: "danger",
  };
}

export function confirmUnarchiveProject(name: string): DestructiveConfirmCopy {
  return {
    title: "Unarchive project?",
    message: `“${name}” returns to active projects.`,
    confirmLabel: "Unarchive",
    tone: "neutral",
  };
}

export function confirmDeleteProject(name: string): DestructiveConfirmCopy {
  return {
    title: "Delete project permanently?",
    message: `“${name}” and its sessions, quotes, contracts, and galleries are removed. This cannot be undone.`,
    confirmLabel: "Delete",
    tone: "danger",
  };
}

export function confirmDeleteSession(label: string): DestructiveConfirmCopy {
  return {
    title: "Delete session?",
    message: `“${label}” and its quote, plan, and gallery photos are removed. This cannot be undone.`,
    confirmLabel: "Delete",
    tone: "danger",
  };
}

export function confirmDeletePhotos(count: number): DestructiveConfirmCopy {
  return {
    title: count === 1 ? "Delete photo?" : `Delete ${count} photos?`,
    message: "Removed from the gallery. This cannot be undone.",
    confirmLabel: "Delete",
    tone: "danger",
  };
}

export function confirmMarkDelivered(): DestructiveConfirmCopy {
  return {
    title: "Mark delivered?",
    message:
      "Marks the session delivered. Use Archive when the gallery window is closed to zip and remove photos.",
    confirmLabel: "Mark delivered",
    tone: "neutral",
  };
}
