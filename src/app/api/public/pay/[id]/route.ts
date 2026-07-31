import { NextResponse } from "next/server";
import { listStudiosWithPaymentLink } from "@/lib/db/payments";
import { clientIp, rateLimitShared } from "@/lib/rate-limit";
import {
  createPaymentLinkCheckout,
  getStripe,
  grossUpAmount,
} from "@/lib/stripe";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const hit = await listStudiosWithPaymentLink(id);
  if (!hit) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const feePreview =
    hit.link.mode === "fixed" && hit.link.amount
      ? grossUpAmount(hit.link.amount)
      : undefined;
  return NextResponse.json({
    paymentLink: hit.link,
    studioName: hit.studioName,
    studio: {
      name: hit.studioName,
      theme: hit.theme ?? null,
    },
    feePreview,
    checkoutReady: Boolean(
      getStripe() && hit.stripeAccountId && hit.stripeOnboardingComplete,
    ),
  });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const limited = await rateLimitShared(
    `pay:${id}:${clientIp(req)}`,
    5,
    60_000,
  );
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }
  const body = await req.json();
  const hit = await listStudiosWithPaymentLink(id);
  if (!hit) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const net =
    hit.link.mode === "fixed"
      ? hit.link.amount || 0
      : Number(body.amount) || 0;
  if (net <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }
  if (
    hit.link.mode === "customer_chooses" &&
    hit.link.minAmount != null &&
    net < hit.link.minAmount
  ) {
    return NextResponse.json({ error: "Below minimum" }, { status: 400 });
  }
  if (
    hit.link.mode === "customer_chooses" &&
    hit.link.maxAmount != null &&
    net > hit.link.maxAmount
  ) {
    return NextResponse.json({ error: "Above maximum" }, { status: 400 });
  }

  const payerEmail = String(body.email || "").trim().toLowerCase();
  const payerName = String(body.name || "").trim();

  const checkoutReady = Boolean(
    getStripe() && hit.stripeAccountId && hit.stripeOnboardingComplete,
  );
  if (!checkoutReady) {
    return NextResponse.json(
      {
        error: "Payments are not available for this studio yet.",
        checkoutReady: false,
      },
      { status: 503 },
    );
  }

  const checkout = await createPaymentLinkCheckout({
    stripeAccountId: hit.stripeAccountId!,
    paymentLinkId: id,
    studioId: hit.studioId,
    title: hit.link.title,
    description: hit.link.description,
    netAmount: net,
    customerEmail: payerEmail || undefined,
    customerName: payerName || undefined,
    projectId: hit.link.projectId,
    studioName: hit.studioName,
    idempotencyKey: `pay-checkout/${id}/${payerEmail || "guest"}/${net.toFixed(2)}`,
  });
  if (checkout?.session.url) {
    return NextResponse.json({
      checkoutUrl: checkout.session.url,
      sessionId: checkout.session.id,
      ...checkout.breakdown,
    });
  }

  // Never mark paid without a real Checkout Session (AURA-004).
  return NextResponse.json(
    { error: "Could not start checkout. Try again shortly." },
    { status: 502 },
  );
}
