"use client";

import { Button, Field, Input, Label } from "@/components/ui";
import type { Comment } from "@/lib/types";

/** Lightbox comments list + post form — lazy-chunked with overlays (AURA-411). */
export function PhotoCommentPanel({
  comments,
  name,
  body,
  company,
  onNameChange,
  onBodyChange,
  onCompanyChange,
  onSubmit,
}: {
  comments: Comment[];
  name: string;
  body: string;
  company: string;
  onNameChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onCompanyChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-3">
      {comments.length ? (
        <ul className="space-y-2">
          {comments.map((c) => (
            <li key={c.id} className="break-words text-sm text-ink">
              <span className="font-medium">{c.authorName}</span>
              <span className="text-muted"> · </span>
              {c.body}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="relative flex flex-col gap-2 sm:flex-row sm:items-end">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0"
        >
          <Label htmlFor="lb-comment-company">Company</Label>
          <Input
            id="lb-comment-company"
            name="company"
            tabIndex={-1}
            autoComplete="off"
            value={company}
            onChange={(e) => onCompanyChange(e.target.value)}
          />
        </div>
        <Field className="min-w-0 flex-1">
          <Label htmlFor="lb-comment-name">Name</Label>
          <Input
            id="lb-comment-name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
          />
        </Field>
        <Field className="min-w-0 flex-[2]">
          <Label htmlFor="lb-comment-body">Comment</Label>
          <Input
            id="lb-comment-body"
            value={body}
            onChange={(e) => onBodyChange(e.target.value)}
          />
        </Field>
        <Button
          size="sm"
          className="min-h-11 w-full sm:w-auto"
          onClick={onSubmit}
        >
          Post
        </Button>
      </div>
    </div>
  );
}
