import { NextResponse } from "next/server";
import { listStudiosWithPaymentLink, recordPaymentLinkCharge } from "@/lib/db/payments";
import {
  createPaymentLinkCheckout,
  getStripe,
  grossUpAmount,
} from "@/lib/stripe";
import { emailPaymentReceipt, notifyStudio } from "@/lib/notify/send";

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

  const breakdown = grossUpAmount(net);
  const payerEmail = String(body.email || "").trim().toLowerCase();
  const payerName = String(body.name || "").trim();

  if (
    getStripe() &&
    hit.stripeAccountId &&
    hit.stripeOnboardingComplete
  ) {
    const checkout = await createPaymentLinkCheckout({
      stripeAccountId: hit.stripeAccountId,
      paymentLinkId: id,
      studioId: hit.studioId,
      title: hit.link.title,
      description: hit.link.description,
      netAmount: net,
      customerEmail: payerEmail || undefined,
      customerName: payerName || undefined,
      projectId: hit.link.projectId,
      studioName: hit.studioName,
    });
    if (checkout?.session.url) {
      return NextResponse.json({
        checkoutUrl: checkout.session.url,
        sessionId: checkout.session.id,
        ...checkout.breakdown,
      });
    }
  }

  // Fallback when Stripe not configured: record locally
  await recordPaymentLinkCharge({
    studioId: hit.studioId,
    linkId: id,
    projectId: hit.link.projectId,
    ...breakdown,
  });
  await notifyStudio({
    studioId: hit.studioId,
    type: "payment_received",
    title: "Payment received",
    body: `${hit.link.title}: $${breakdown.netAmount.toFixed(2)}`,
    href: hit.link.projectId
      ? `/admin/projects/${hit.link.projectId}`
      : "/admin/payments",
  });
  if (payerEmail) {
    await emailPaymentReceipt({
      studioId: hit.studioId,
      to: payerEmail,
      clientName: payerName || undefined,
      title: hit.link.title,
      ...breakdown,
    });
  }
  return NextResponse.json({
    ok: true,
    recordedLocally: true,
    ...breakdown,
  });
}
