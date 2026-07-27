"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Button,
  Field,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui";
import type { IntakeQuestion } from "@/lib/types";

export default function PublicQuestionnairePage() {
  const params = useParams<{ token: string }>();
  const [title, setTitle] = useState("");
  const [studioName, setStudioName] = useState("");
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
        if (data.questionnaire.submittedAt) {
          setSubmitted(true);
          setAnswers(data.questionnaire.answers || {});
        }
      })
      .catch(() => setError("Could not load"));
  }, [params.token]);

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
    return <p className="shell-pad py-20 text-center text-muted">{error}</p>;
  }

  if (!title) {
    return <p className="shell-pad py-20 text-center text-muted">Loading…</p>;
  }

  return (
    <div className="shell-pad mx-auto max-w-lg py-12">
      <p className="text-sm text-muted">{studioName}</p>
      <h1 className="mt-1 font-display text-3xl">{title}</h1>
      {submitted ? (
        <p className="mt-6 text-muted">Thanks — your answers were saved.</p>
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
  );
}
