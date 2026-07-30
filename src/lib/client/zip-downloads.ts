import JSZip from "jszip";
import { uniqueZipName } from "@/lib/images/download-filename";

export type SignedDownloadItem = {
  url: string;
  filename: string;
};

export type ClientZipProgress = {
  done: number;
  total: number;
};

const FETCH_CONCURRENCY = 3;

/**
 * Fetch signed original URLs in the browser and build one zip (AURA-356).
 * Keeps wedding-size originals off the App Hosting process.
 */
export async function zipSignedDownloads(
  items: SignedDownloadItem[],
  opts?: {
    onProgress?: (p: ClientZipProgress) => void;
    signal?: AbortSignal;
  },
): Promise<Blob> {
  const zip = new JSZip();
  const used = new Set<string>();
  let done = 0;
  const total = items.length;

  async function addOne(item: SignedDownloadItem) {
    if (opts?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const res = await fetch(item.url, { mode: "cors", signal: opts?.signal });
    if (!res.ok) {
      throw new Error(`Could not fetch ${item.filename} (${res.status})`);
    }
    const buf = await res.arrayBuffer();
    const name = uniqueZipName(used, item.filename || "photo.jpg");
    zip.file(name, buf);
    done += 1;
    opts?.onProgress?.({ done, total });
  }

  for (let i = 0; i < items.length; i += FETCH_CONCURRENCY) {
    const batch = items.slice(i, i + FETCH_CONCURRENCY);
    await Promise.all(batch.map(addOne));
  }

  return zip.generateAsync({ type: "blob", compression: "STORE" });
}

export function saveBlobDownload(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}
