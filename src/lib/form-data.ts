/**
 * FormData file extraction that works across Node/undici/App Hosting.
 * Avoids brittle `instanceof File` / `instanceof Blob` checks.
 */
export function formDataFiles(
  form: FormData,
  field = "files",
): Array<Blob & { name?: string; type: string }> {
  const out: Array<Blob & { name?: string; type: string }> = [];
  for (const entry of form.getAll(field)) {
    if (typeof entry === "string") continue;
    if (
      entry &&
      typeof entry === "object" &&
      typeof (entry as Blob).arrayBuffer === "function" &&
      typeof (entry as Blob).size === "number"
    ) {
      out.push(entry as Blob & { name?: string; type: string });
    }
  }
  return out;
}

export function formDataFile(
  form: FormData,
  field = "file",
): (Blob & { name?: string; type: string }) | null {
  return formDataFiles(form, field)[0] || null;
}
