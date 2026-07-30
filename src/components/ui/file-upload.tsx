"use client";

import { useCallback, useId, useRef, useState, type ReactNode } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/cn";

export type UploadItemStatus = "queued" | "uploading" | "done" | "error";

export type UploadItem = {
  id: string;
  name: string;
  status: UploadItemStatus;
  error?: string;
};

export function FileUploadButton({
  label,
  accept = "image/*",
  multiple = false,
  disabled,
  tone = "accent",
  size = "md",
  className,
  onFiles,
}: {
  label: ReactNode;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  tone?: ButtonProps["tone"];
  size?: ButtonProps["size"];
  className?: string;
  onFiles: (files: File[]) => void | Promise<void>;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <Button
        type="button"
        tone={tone}
        size={size}
        className={className}
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        {label}
      </Button>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        tabIndex={-1}
        disabled={disabled}
        onChange={(e) => {
          const list = e.target.files;
          e.target.value = "";
          if (!list?.length) return;
          void onFiles(Array.from(list));
        }}
      />
    </>
  );
}

export function UploadStatusDialog({
  open,
  onClose,
  title,
  items,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  items: UploadItem[];
  busy: boolean;
}) {
  const done = items.filter((i) => i.status === "done").length;
  const failed = items.filter((i) => i.status === "error").length;
  const total = items.length;
  const pct = total ? Math.round(((done + failed) / total) * 100) : 0;

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      title={title}
    >
      <div className="space-y-4">
        <div>
          <div className="mb-1 flex justify-between text-sm text-muted">
            <span>
              {busy
                ? `Uploading ${done + failed + (items.some((i) => i.status === "uploading") ? 1 : 0)} of ${total}`
                : failed
                  ? `${done} uploaded · ${failed} failed`
                  : `${done} of ${total} uploaded`}
            </span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-line">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-base",

                failed && !busy ? "bg-danger" : "bg-accent",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <ul className="max-h-56 space-y-2 overflow-y-auto text-sm">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 rounded-md border border-line px-3 py-2"
            >
              <span className="min-w-0 truncate font-medium">{item.name}</span>
              <span
                className={cn(
                  "shrink-0 text-xs",
                  item.status === "done" && "text-success",
                  item.status === "error" && "text-danger",
                  item.status === "uploading" && "text-accent",
                  item.status === "queued" && "text-muted",
                )}
              >
                {item.status === "queued" && "Waiting"}
                {item.status === "uploading" && "Uploading…"}
                {item.status === "done" && "Done"}
                {item.status === "error" && (item.error || "Failed")}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex justify-end">
          <Button type="button" tone="neutral" disabled={busy} onClick={onClose}>
            {busy ? "Uploading…" : "Close"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export function useUploadSession() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("Uploading");
  const [items, setItems] = useState<UploadItem[]>([]);
  const [busy, setBusy] = useState(false);

  const close = useCallback(() => {
    if (busy) return;
    setOpen(false);
  }, [busy]);

  const runUpload = useCallback(
    async (opts: {
      title?: string;
      files: File[];
      uploadFile: (file: File) => Promise<void>;
    }) => {
      if (!opts.files.length) return;
      const queued: UploadItem[] = opts.files.map((file, i) => ({
        id: `${Date.now()}-${i}-${file.name}`,
        name: file.name,
        status: "queued",
      }));
      setTitle(opts.title || "Uploading");
      setItems(queued);
      setOpen(true);
      setBusy(true);

      for (let i = 0; i < opts.files.length; i++) {
        const file = opts.files[i];
        const id = queued[i].id;
        setItems((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, status: "uploading" } : item,
          ),
        );
        try {
          await opts.uploadFile(file);
          setItems((prev) =>
            prev.map((item) =>
              item.id === id ? { ...item, status: "done" } : item,
            ),
          );
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Upload failed";
          setItems((prev) =>
            prev.map((item) =>
              item.id === id
                ? { ...item, status: "error", error: message }
                : item,
            ),
          );
        }
      }

      setBusy(false);
    },
    [],
  );

  return {
    open,
    title,
    items,
    busy,
    close,
    runUpload,
    dialog: (
      <UploadStatusDialog
        open={open}
        onClose={close}
        title={title}
        items={items}
        busy={busy}
      />
    ),
  };
}
