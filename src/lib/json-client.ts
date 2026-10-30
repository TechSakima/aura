/**
 * Plain JSON value safe for public responses.
 * Firestore timestamps become ISO strings. Cycles are dropped instead of throwing.
 */
export function toClientJson<T>(value: T): T {
  return walk(value, new WeakSet()) as T;
}

function walk(value: unknown, stack: WeakSet<object>): unknown {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (!value || typeof value !== "object") return value;

  const withDate = value as { toDate?: () => Date };
  if (typeof withDate.toDate === "function") {
    try {
      return withDate.toDate().toISOString();
    } catch {
      /* fall through */
    }
  }

  const ref = value as { path?: unknown; firestore?: unknown };
  if (typeof ref.path === "string" && ref.firestore) return ref.path;

  if (stack.has(value)) return undefined;
  stack.add(value);
  try {
    if (Array.isArray(value)) {
      return value.map((item) => walk(item, stack));
    }
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      const next = walk(child, stack);
      if (next !== undefined) out[key] = next;
    }
    return out;
  } finally {
    stack.delete(value);
  }
}
