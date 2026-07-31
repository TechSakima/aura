"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Dialog,
  EmptyState,
  Field,
  Label,
  List,
  ListRow,
  SectionIntro,
  Textarea,
  useToast,
} from "@/components/ui";

type MessageRow = {
  id: string;
  name: string;
  email: string;
  source: string;
  context?: string;
  preview: string;
  /** Full body — list shows truncated preview (AURA-448). */
  message?: string;
  createdAt: string;
  sessionId?: string;
};

/** Project / session contact trail + mailto / Send via Aura (AURA-373 / AURA-374). */
export function ProjectMessagesTrail({
  projectId,
  sessionId,
}: {
  projectId: string;
  sessionId?: string;
}) {
  const { push } = useToast();
  const [messages, setMessages] = useState<MessageRow[] | null>(null);
  const [error, setError] = useState("");
  const [replyTo, setReplyTo] = useState<MessageRow | null>(null);
  const [viewing, setViewing] = useState<MessageRow | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setError("");
    const qs = sessionId
      ? `?sessionId=${encodeURIComponent(sessionId)}`
      : "";
    try {
      const res = await fetch(`/api/projects/${projectId}/messages${qs}`);
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        messages?: MessageRow[];
      };
      if (!res.ok) {
        setError(String(json.error || "Could not load messages"));
        setMessages([]);
        return;
      }
      setMessages(json.messages || []);
    } catch {
      setError("Could not load messages");
      setMessages([]);
    }
  }, [projectId, sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#messages") return;
    document
      .getElementById("messages")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [messages]);

  function openSend(m: MessageRow) {
    setReplyTo(m);
    setDraft("");
  }

  function closeSend() {
    if (sending) return;
    setReplyTo(null);
    setDraft("");
  }

  async function sendReply() {
    if (!replyTo || sending) return;
    const message = draft.trim();
    if (!message) {
      push("Message required", "danger");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: replyTo.email,
          clientName: replyTo.name,
          message,
          sessionId: sessionId || replyTo.sessionId,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        push(String(json.error || "Could not send"), "danger");
        return;
      }
      push("Sent", "success");
      setReplyTo(null);
      setDraft("");
      await load();
    } catch {
      push("Could not send", "danger");
    } finally {
      setSending(false);
    }
  }

  return (
    <section id="messages" className="scroll-mt-[var(--admin-scroll-mt)] space-y-5">
      <SectionIntro eyebrow="Project" title="Messages" />
      {messages == null ? (
        <EmptyState variant="inline" title="Loading messages…" />
      ) : error ? (
        <EmptyState variant="inline" title={error} />
      ) : messages.length === 0 ? (
        <EmptyState variant="inline" title="No messages yet" />
      ) : (
        <List>
          {messages.map((m) => {
            const body = m.preview || m.message || "";
            const summary = `${m.source}${m.context ? ` · ${m.context}` : ""}${body ? ` — ${body}` : ""}`;
            return (
              <ListRow key={m.id}>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{m.name}</p>
                  <button
                    type="button"
                    className="mt-0.5 min-h-11 w-full truncate text-left text-sm text-muted underline-offset-2 hover:text-ink hover:underline"
                    title={summary}
                    onClick={() => setViewing(m)}
                  >
                    {summary}
                  </button>
                  <p className="mt-1 text-xs text-muted">
                    {formatWhen(m.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
                  <Button
                    size="sm"
                    tone="ghost"
                    className="min-h-11"
                    onClick={() => openSend(m)}
                  >
                    Send
                  </Button>
                  <a
                    className="inline-flex min-h-11 items-center text-sm text-accent no-underline"
                    href={`mailto:${m.email}`}
                  >
                    Reply
                  </a>
                </div>
              </ListRow>
            );
          })}
        </List>
      )}

      <Dialog
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title={viewing?.name || "Message"}
      >
        {viewing ? (
          <div className="space-y-4">
            <p className="text-sm text-muted">{viewing.email}</p>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-muted">
                  Source
                </dt>
                <dd className="mt-1 text-ink">{viewing.source}</dd>
              </div>
              {viewing.context ? (
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-muted">
                    Context
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap text-ink">
                    {viewing.context}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-muted">
                  Message
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-ink">
                  {viewing.message || viewing.preview || "—"}
                </dd>
              </div>
            </dl>
            <p className="text-xs text-muted">
              {formatWhen(viewing.createdAt)}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                tone="accent"
                className="min-h-11"
                onClick={() => {
                  const m = viewing;
                  setViewing(null);
                  openSend(m);
                }}
              >
                Send
              </Button>
              <Button
                tone="ghost"
                className="min-h-11"
                onClick={() => setViewing(null)}
              >
                Close
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={Boolean(replyTo)}
        onClose={closeSend}
        title="Send reply"
      >
        {replyTo ? (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              To {replyTo.name} · {replyTo.email}
            </p>
            <Field>
              <Label>Message</Label>
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={6}
                maxLength={4000}
                disabled={sending}
                autoFocus
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button
                tone="accent"
                className="min-h-11"
                disabled={sending || !draft.trim()}
                onClick={() => void sendReply()}
              >
                {sending ? "Sending…" : "Send"}
              </Button>
              <Button
                tone="ghost"
                className="min-h-11"
                disabled={sending}
                onClick={closeSend}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </section>
  );
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
