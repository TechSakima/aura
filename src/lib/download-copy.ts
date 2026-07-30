/** Guest-facing download copy (AURA-249). */

export type DownloadCopyMode = "all" | "favorites" | "single" | "album";

export type DownloadCopy = {
  title: string;
  description: string;
  confirmLabel: string;
  footnote: string;
};

const ORIGINALS =
  "Downloads are full-resolution originals — not the previews on this page.";

const VIDEOS_BULK =
  "Videos are left out of the zip. Open a video and download it alone.";

export function downloadCopy(
  mode: DownloadCopyMode,
  opts?: { count?: number; emphasizePin?: boolean },
): DownloadCopy {
  const pinLead = opts?.emphasizePin
    ? "PIN required. "
    : "Enter the 4-digit PIN your photographer shared. ";

  switch (mode) {
    case "favorites": {
      const n = opts?.count ?? 0;
      const countLabel =
        n > 0
          ? `${n} favorite photo${n === 1 ? "" : "s"}`
          : "your favorites";
      return {
        title: "Download favorites",
        description: `${pinLead}${ORIGINALS} Zip includes ${countLabel}. ${VIDEOS_BULK}`,
        confirmLabel: "Download zip",
        footnote: ORIGINALS,
      };
    }
    case "single":
      return {
        title: "Download photo",
        description: `${pinLead}${ORIGINALS}`,
        confirmLabel: "Download",
        footnote: ORIGINALS,
      };
    case "album":
      return {
        title: "Download album",
        description: `${pinLead}${ORIGINALS} ${VIDEOS_BULK}`,
        confirmLabel: "Download",
        footnote: ORIGINALS,
      };
    case "all":
    default:
      return {
        title: "Download gallery",
        description: `${pinLead}${ORIGINALS} ${VIDEOS_BULK}`,
        confirmLabel: "Download zip",
        footnote: ORIGINALS,
      };
  }
}

/** Confirm copy when no PIN is required. */
export function downloadConfirmCopy(
  mode: DownloadCopyMode,
  opts?: { count?: number },
): DownloadCopy {
  const base = downloadCopy(mode, opts);
  return {
    ...base,
    description: base.description
      .replace(/^PIN required\. /, "")
      .replace(
        /^Enter the 4-digit PIN your photographer shared\. /,
        "",
      ),
  };
}

export function emptyDownloadMessage(mode: DownloadCopyMode): string {
  if (mode === "favorites") {
    return "No downloadable originals in favorites. Videos need a single-photo download.";
  }
  if (mode === "album") {
    return "No downloadable originals in this album. Videos need a single-photo download.";
  }
  if (mode === "single") {
    return "Original not available for this photo.";
  }
  return "No downloadable originals found. Videos are not included in bulk download.";
}
