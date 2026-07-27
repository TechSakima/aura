/**
 * Offering / session-type names are labels ("Wedding", "Portrait session").
 * Never treat them as grammatical subjects ("Your Wedding is confirmed").
 */

export function offeringLabel(raw?: string | null): string {
  const s = (raw || "").trim();
  return s || "Session";
}

/** Confirmed booking — date first, offering as a label. */
export function bookingConfirmedSentence(
  when: string,
  offering?: string | null,
): string {
  return `You're confirmed for ${when} · ${offeringLabel(offering)}.`;
}

export function bookingDeclinedSentence(offering?: string | null): string {
  return `We can't take your booking request for ${offeringLabel(offering)}.`;
}

export function bookingCanceledStudioSentence(
  clientName: string,
  offering?: string | null,
): string {
  return `${clientName} canceled their booking request for ${offeringLabel(offering)}.`;
}

/** Default proposal title — avoid "Wedding Quote". */
export function defaultQuoteTitle(packageOrOffering?: string | null): string {
  const label = (packageOrOffering || "").trim();
  if (!label) return "Quote";
  if (/quote$/i.test(label)) return label;
  return label;
}

/** HTML block for the client's next action. */
export function nextStepHtml(instruction: string): string {
  return `<p style="margin-top:20px"><strong>Next</strong><br/>${instruction}</p>`;
}

export function nextStepAfterBookingConfirm(
  step?: "questionnaire" | "pricing" | "contract" | string | null,
): string {
  if (step === "questionnaire") {
    return "Watch for a questionnaire email — complete it so we can prepare your quote.";
  }
  if (step === "contract") {
    return "We'll send your agreement to review and sign.";
  }
  if (step === "pricing") {
    return "We'll send a quote for you to review.";
  }
  return "We'll email you with the next step shortly.";
}
