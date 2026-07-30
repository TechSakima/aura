"use client";

import { FormEvent, useEffect, useState, type CSSProperties } from "react";

import { useParams } from "next/navigation";
import { StudioMark } from "@/components/brand/StudioMark";
import { PublicSoftFailureContact } from "@/components/public/PublicSoftFailureContact";
import { PublicSuccess } from "@/components/public/PublicSuccess";
import { PublicShell } from "@/components/shells/PublicShell";
import {
  Button,
  Checkbox,
  Field,
  Input,
  Label,
  SectionIntro,
  Select,
  Textarea,
  useToast,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  resolveStudioThemePreset,
  studioThemeCssVars,
} from "@/lib/themes";
import type {
  IntakeQuestion,
  PackageTier,
  Proposal,
  StudioTheme,
} from "@/lib/types";
import type { QuoteAcceptNext } from "@/lib/workflow/quote-next";

type ProposalPayload = {
  proposal: Proposal;
  studio: {
    name: string;
    logoUrl?: string;
    brandTagline?: string;
    theme?: StudioTheme;
  };
  clientName?: string;
  projectName?: string;
  next?: QuoteAcceptNext;
};

export default function PublicProposalPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const { push } = useToast();
  const [data, setData] = useState<ProposalPayload | null>(null);
  const [selectedTierId, setSelectedTierId] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [accepted, setAccepted] = useState(false);
  const [next, setNext] = useState<QuoteAcceptNext | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/public/proposals/${token}`)
      .then(async (r) => {
        const json = await r.json().catch(() => ({}));
        if (!r.ok) {
          setError(String(json.error || "Quote not found"));
          return;
        }
        const payload = json as ProposalPayload;
        setData(payload);
        setSelectedTierId(
          payload.proposal.selectedTierId ||
            payload.proposal.tiers.find((t) => t.highlighted)?.id ||
            payload.proposal.tiers[0]?.id ||
            "",
        );
        setAccepted(payload.proposal.status === "accepted");
        setNext(payload.next || null);
      })
      .catch(() => setError("Could not load quote"));
  }, [token]);

  function setAnswer(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  async function onAccept(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch(`/api/public/proposals/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedTierId, intakeAnswers: answers }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      push(String(json.error || "Could not accept quote"), "danger");
      return;
    }
    setAccepted(true);
    setData((prev) =>
      prev ? { ...prev, proposal: json.proposal } : prev,
    );
    setNext(json.next || null);
  }

  if (error) {
    return (
      <PublicShell>
        <p className="text-center text-danger">{error}</p>
      </PublicShell>
    );
  }

  if (!data) {
    return (
      <PublicShell>
        <p className="text-muted">Loading quote…</p>
      </PublicShell>
    );
  }

  const { proposal, studio, clientName: rawName, projectName } = data;
  const clientName = projectName || rawName;
  const selectedTier = proposal.tiers.find((t) => t.id === selectedTierId);
  const declined = proposal.status === "declined";
  const themeStyle = studioThemeCssVars(
    resolveStudioThemePreset(studio.theme),
    { fontPreset: studio.theme?.fontPreset },
  ) as CSSProperties;

  return (
    <PublicShell
      bare
      style={themeStyle}
      footer={
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-medium text-ink">{studio.name}</p>
          {studio.brandTagline ? <p>{studio.brandTagline}</p> : null}
        </div>
      }
    >
      <section className="relative overflow-hidden bg-ink text-surface">
        <div className="absolute inset-0 bg-gradient-to-br from-ink via-ink to-accent/35" />
        <div className="relative shell-pad mx-auto max-w-[var(--public-max)] py-14 sm:py-20">

          <div className="max-w-2xl animate-enter">
            <StudioMark
              logoUrl={studio.logoUrl}
              name={studio.name}
              tone="light"
            />
            {clientName ? (
              <p className="mb-2 text-sm text-surface/75">For {clientName}</p>
            ) : null}
            <h1 className="font-display text-4xl tracking-tight sm:text-6xl">
              {proposal.title}
            </h1>
            <p className="mt-4 max-w-lg text-surface/70">
              Choose a package, share a few details, and confirm when you’re ready.
            </p>
          </div>
        </div>
      </section>

      <div className="shell-pad mx-auto max-w-[var(--public-max)] space-y-16 py-12 sm:py-16">
        {proposal.moodBoard.length > 0 ? (
          <section className="space-y-6">
            <SectionIntro eyebrow="Inspiration" title="Mood board" />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 md:gap-3">
              {proposal.moodBoard.map((item) => (
                <figure
                  key={item.id}
                  className="overflow-hidden rounded-md"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.url}
                    alt={item.caption || ""}
                    className="aspect-square w-full object-cover transition-transform duration-emphasis hover:scale-[1.02]"
                  />
                </figure>
              ))}
            </div>
          </section>
        ) : null}

        <section className="space-y-6">
          <SectionIntro
            eyebrow="Investment"
            title="Packages"
            description="Select the option that fits your day."
          />
          <div className="grid gap-3 md:grid-cols-3">
            {proposal.tiers.map((tier: PackageTier) => {
              const selected = selectedTierId === tier.id;
              return (
                <button
                  key={tier.id}
                  type="button"
                  disabled={accepted || declined}
                  onClick={() => setSelectedTierId(tier.id)}
                  className={cn(
                    "group flex flex-col rounded-md border p-5 text-left transition-colors",
                    selected
                      ? "border-ink bg-ink text-surface"
                      : "border-line bg-surface hover:border-ink/40",
                    accepted && !selected && "opacity-50",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-2xl">{tier.name}</h3>
                    {tier.highlighted ? (
                      <span
                        className={cn(
                          "text-[10px] uppercase tracking-wider",
                          selected ? "text-surface/70" : "text-accent",
                        )}
                      >
                        Popular
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 font-display text-4xl tracking-tight">
                    ${tier.price.toLocaleString()}
                  </p>
                  <p
                    className={cn(
                      "mt-3 flex-1 text-sm",
                      selected ? "text-surface/75" : "text-muted",
                    )}
                  >
                    {tier.description}
                  </p>
                  {!accepted && !declined ? (
                    <span
                      className={cn(
                        "mt-5 text-sm font-medium",
                        selected ? "text-surface" : "text-accent",
                      )}
                    >
                      {selected ? "Selected" : "Select package"}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>

        {proposal.inclusions.length > 0 ? (
          <section className="space-y-6">
            <SectionIntro eyebrow="Included" title="What’s covered" />
            <ul className="grid gap-3 sm:grid-cols-2">
              {proposal.inclusions.map((item) => (
                <li
                  key={item}
                  className="border-b border-line pb-3 text-sm text-ink"
                >
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {proposal.terms ? (
          <section className="space-y-4">
            <SectionIntro eyebrow="Details" title="Terms" />
            <p className="max-w-3xl whitespace-pre-wrap text-sm leading-relaxed text-muted">
              {proposal.terms}
            </p>
          </section>
        ) : null}

        {declined ? (
          <section className="space-y-4 border-t border-line pt-12">
            <SectionIntro
              eyebrow="Quote"
              title="This quote isn’t available"
            />
            <div className="mx-auto flex max-w-lg justify-center">
              <PublicSoftFailureContact
                studioName={studio.name}
                source="other"
                proposalToken={token}
                context={proposal.title || "Quote"}
              />
            </div>
          </section>
        ) : accepted ? (
          <PublicSuccess title="Quote accepted">
            <p>
              Thank you
              {clientName ? `, ${clientName}` : ""}.
              {selectedTier ? ` You’re set with ${selectedTier.name}.` : ""}
            </p>
            <p className="text-sm">
              {next?.nextStep === "deposit"
                ? "Next: deposit"
                : "Next: contract, then deposit"}
            </p>
            {(next?.contractHref || next?.depositHref) && (
              <div className="mt-6 flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center">
                {next.contractHref ? (
                  <a
                    href={next.contractHref}
                    className="inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-5 text-sm font-medium text-accent-ink no-underline"
                  >
                    Sign contract
                  </a>
                ) : null}
                {next.depositHref ? (
                  <a
                    href={next.depositHref}
                    className={
                      next.contractHref
                        ? "inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-surface px-5 text-sm font-medium text-ink no-underline"
                        : "inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-5 text-sm font-medium text-accent-ink no-underline"
                    }
                  >
                    Pay deposit
                  </a>
                ) : null}
              </div>
            )}
            {!next?.contractHref && !next?.depositHref ? (
              <div className="mx-auto flex max-w-md justify-center">
                <PublicSoftFailureContact
                  studioName={studio.name}
                  source="other"
                  proposalToken={token}
                  context={proposal.title || "Quote accepted"}
                />
              </div>
            ) : null}
          </PublicSuccess>
        ) : (
          <section className="space-y-6 border-t border-line pt-12">
            <SectionIntro
              eyebrow="Next step"
              title="A few details"
              description={
                selectedTier
                  ? `Confirming ${selectedTier.name} · $${selectedTier.price.toLocaleString()}`
                  : "Select a package above first."
              }
            />
            <form
              onSubmit={onAccept}
              className="mx-auto max-w-lg space-y-4"
            >
              {proposal.intakeSchema.map((q: IntakeQuestion) => (
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
                      onChange={(e) => setAnswer(q.id, e.target.value)}
                    />
                  ) : q.type === "select" ? (
                    <Select
                      id={q.id}
                      required={q.required}
                      value={answers[q.id] || ""}
                      onChange={(e) => setAnswer(q.id, e.target.value)}
                    >
                      <option value="">Select…</option>
                      {q.options?.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </Select>
                  ) : q.type === "date" ? (
                    <Input
                      id={q.id}
                      type="date"
                      required={q.required}
                      value={answers[q.id] || ""}
                      onChange={(e) => setAnswer(q.id, e.target.value)}
                    />
                  ) : (
                    <Input
                      id={q.id}
                      required={q.required}
                      value={answers[q.id] || ""}
                      onChange={(e) => setAnswer(q.id, e.target.value)}
                    />
                  )}
                </Field>
              ))}
              <Field className="flex items-start gap-2">
                <Checkbox id="agree" required />
                <Label htmlFor="agree" className="font-normal">
                  I agree to the terms and want to proceed with the selected
                  package.
                </Label>
              </Field>
              <Button
                type="submit"
                disabled={busy || !selectedTierId}
                className="w-full"
                size="lg"
              >
                {busy ? "Submitting…" : "Accept quote"}
              </Button>
            </form>
          </section>
        )}
      </div>
    </PublicShell>
  );
}
