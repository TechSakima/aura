"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  ADMIN_PALETTE_PAGES,
  filterAdminPaletteItems,
  projectToPaletteItem,
  type AdminPaletteItem,
} from "@/lib/admin-command-palette";
import { cn } from "@/lib/cn";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { List, ListRow } from "@/components/ui/list";

type ProjectOption = { id: string; name: string; email?: string };

export function AdminCommandPalette() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [projects, setProjects] = useState<ProjectOption[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  const items: AdminPaletteItem[] = [
    ...ADMIN_PALETTE_PAGES,
    ...(projects || []).map(projectToPaletteItem),
  ];
  const results = filterAdminPaletteItems(items, query);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "k") return;
      e.preventDefault();
      setOpen((v) => !v);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActive(0);
      setLoadError(false);
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/projects?options=1");
        if (!res.ok) throw new Error("fail");
        const data = (await res.json()) as { projects?: ProjectOption[] };
        if (cancelled) return;
        setProjects(Array.isArray(data.projects) ? data.projects : []);
      } catch {
        if (!cancelled) setLoadError(true);
      }
    }
    if (projects == null) void load();
    return () => {
      cancelled = true;
    };
  }, [open, projects]);

  useEffect(() => {
    setActive(0);
  }, [query, projects]);

  function go(item: AdminPaletteItem) {
    setOpen(false);
    router.push(item.href);
  }

  function onInputKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const item = results[active];
      if (item) go(item);
    }
  }

  return (
    <>
      <IconButton
        label="Jump"
        labelFrom="sm+"
        aria-label="Jump to project"
        aria-keyshortcuts="Meta+K Control+K"
        onClick={() => setOpen(true)}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
      </IconButton>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Jump to"
        initialFocusRef={inputRef}
        className="max-w-md"
      >
        <div className="flex flex-col gap-3">
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Project or page"
            aria-controls={listId}
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
          />

          {loadError ? (
            <EmptyState variant="inline" title="Could not load projects" />
          ) : null}

          {projects == null && !loadError ? (
            <EmptyState variant="loading" title="Loading…" />
          ) : null}

          {projects != null || loadError ? (
            results.length === 0 ? (
              <EmptyState variant="inline" title="No matches" />
            ) : (
              <div
                id={listId}
                role="listbox"
                aria-label="Results"
                className="max-h-[min(50dvh,20rem)] overflow-y-auto overscroll-contain"
              >
                <List>
                  {results.map((item, index) => (
                    <ListRow
                      key={item.id}
                      onClick={() => go(item)}
                      className={cn(
                        "rounded-md px-2",
                        index === active
                          ? "bg-line/50"
                          : "hover:bg-line/30",
                      )}
                    >
                      <div className="min-w-0">
                        <p
                          className="truncate text-sm text-ink"
                          title={item.label}
                        >
                          {item.label}
                        </p>
                        {item.detail ? (
                          <p
                            className="truncate text-xs text-muted"
                            title={item.detail}
                          >
                            {item.detail}
                          </p>
                        ) : (
                          <p className="text-xs text-muted">
                            {item.group === "page" ? "Page" : "Project"}
                          </p>
                        )}
                      </div>
                    </ListRow>
                  ))}
                </List>
              </div>
            )
          ) : null}
        </div>
      </Dialog>
    </>
  );
}
