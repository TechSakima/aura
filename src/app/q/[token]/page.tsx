"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { StudioMark } from "@/components/brand/StudioMark";
import { InstallHintDock } from "@/components/pwa/InstallHintDock";
import { PublicShell } from "@/components/shells/PublicShell";
import { PublicSuccess } from "@/components/public/PublicSuccess";
import {
  Button,
  EmptyState,
  Field,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui";
import { publicStudioShellProps } from "@/lib/public-studio-shell";
import type { IntakeQuestion, StudioTheme } from "@/lib/types";

export default function PublicQuestionnairePage() {
  const params = useParams<{ token: string }>();
  const [title, setTitle] = useState("");
  const [studioName, setStudioName] = useState("");
  const [studioLogoUrl, setStudioLogoUrl] = useState("");
  const [studioTheme, setStudioTheme] = useState<StudioTheme | null>(null);
  const [questions, setQuestions] = useState<IntakeQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetch(`/api/public/questionnaires/${params.token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        setTitle(data.questionnaire.title);
        setQuestions(data.questionnaire.questions || []);
        setStudioName(data.studio?.name || "");
        setStudioLogoUrl(data.studio?.logoUrl || "");
        setStudioTheme(data.studio?.theme ?? null);
        if (data.questionnaire.submittedAt) {
          setSubmitted(true);
          setAnswers(data.questionnaire.answers || {});
        }
      })
      .catch(() => setError("Could not load"));
  }, [params.token]);

  const shell = publicStudioShellProps(studioTheme);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch(`/api/public/questionnaires/${params.token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Submit failed");
      return;
    }
    setSubmitted(true);
  }

  if (error && !title) {
    return (
      <PublicShell {...shell}>
        <EmptyState
          variant="error"
          title={error}
          className="items-center text-center"
        />
      </PublicShell>
    );
  }

  if (!title) {
    return (
      <PublicShell {...shell}>
        <EmptyState
          variant="loading"
          title="Loading…"
          className="py-20 text-center"
        />
      </PublicShell>
    );
  }

  return (
    <PublicShell {...shell}>
      <InstallHintDock storageKey={`aura-install-dismiss-q-${params.token}`} />
      <div className="install-hint-pad mx-auto max-w-lg">
        <StudioMark
          logoUrl={studioLogoUrl || undefined}
          name={studioName}
          tone="dark"
          className="mb-2"
        />
        <h1 className="min-w-0 break-words font-display text-3xl">{title}</h1>
        {submitted ? (
          <PublicSuccess title="Answers saved">
            <dl className="mt-6 space-y-4 border-t border-line pt-6 text-left">
              {questions.map((q) => (
                <div key={q.id}>
                  <dt className="text-xs uppercase tracking-[0.14em] text-muted">
                    {q.label}
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm text-ink">
                    {answers[q.id]?.trim() || "—"}
                  </dd>
                </div>
              ))}
            </dl>
          </PublicSuccess>
        ) : questions.length === 0 ? (
          <EmptyState
            variant="inline"
            title="No questions to answer."
            className="mt-6"
          />
        ) : (
          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            {questions.map((q) => (
              <Field key={q.id}>
                <Label htmlFor={q.id}>
                  {q.label}
                  {q.required ? " *" : ""}
                </Label>
                {q.type === "textarea" ? (
                  <Textarea
                    id={q.id}
                    required={q.required}
                    value={answers[q.id] || ""}
                    onChange={(e) =>
                      setAnswers((a) => ({ ...a, [q.id]: e.target.value }))
                    }
                    rows={4}
                  />
                ) : q.type === "select" ? (
                  <Select
                    id={q.id}
                    required={q.required}
                    value={answers[q.id] || ""}
                    onChange={(e) =>
                      setAnswers((a) => ({ ...a, [q.id]: e.target.value }))
                    }
                  >
                    <option value="">Select…</option>
                    {(q.options || []).map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    id={q.id}
                    type={q.type === "date" ? "date" : "text"}
                    required={q.required}
                    value={answers[q.id] || ""}
                    onChange={(e) =>
                      setAnswers((a) => ({ ...a, [q.id]: e.target.value }))
                    }
                  />
                )}
              </Field>
            ))}
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <Button type="submit" disabled={busy}>
              {busy ? "Sending…" : "Submit"}
            </Button>
          </form>
        )}
      </div>
    </PublicShell>
  );
}
