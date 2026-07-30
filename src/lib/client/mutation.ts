/** Client mutation helper — honest pending/error, never silent success (AURA-264). */

import { isNetworkError, mutationOfflineMessage } from "@/lib/offline";

export type MutateOk<T> = { ok: true; status: number; data: T };
export type MutateFail<T = unknown> = {
  ok: false;
  status: number;
  data: T;
  errorMessage: string;
};
export type MutateResult<T = Record<string, unknown>> = MutateOk<T> | MutateFail<T>;

type MutateOptions = {
  /** Verb for offline copy — “save”, “upload”, “update”. */
  action?: string;
};

/**
 * JSON fetch for admin/public mutations. Never throws for network failure —
 * returns `{ ok: false, errorMessage }` so callers can toast and clear pending.
 */
export async function mutateJson<T = Record<string, unknown>>(
  url: string,
  init?: RequestInit,
  options?: MutateOptions,
): Promise<MutateResult<T>> {
  const action = options?.action ?? "save";
  try {
    const res = await fetch(url, init);
    const data = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) {
      const fromApi =
        data && typeof data === "object" && typeof data.error === "string"
          ? data.error
          : "";
      return {
        ok: false,
        status: res.status,
        data,
        errorMessage: fromApi || mutationOfflineMessage(action),
      };
    }
    return { ok: true, status: res.status, data };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: {} as T,
      errorMessage: isNetworkError(err)
        ? mutationOfflineMessage(action)
        : err instanceof Error
          ? err.message
          : mutationOfflineMessage(action),
    };
  }
}

/** Map thrown upload/network errors to sparse offline / timeout copy. */
export function uploadErrorMessage(err: unknown): string {
  if (
    err instanceof Error &&
    (err.name === "UploadTimeoutError" || /timed out/i.test(err.message))
  ) {
    return err.message.trim() || "Upload timed out — try again";
  }
  if (isNetworkError(err)) return mutationOfflineMessage("upload");
  if (err instanceof Error && err.message.trim()) return err.message;
  return mutationOfflineMessage("upload");
}
