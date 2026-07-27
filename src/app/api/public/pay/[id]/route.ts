import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { listStudiosWithPaymentLink, recordPaymentLinkCharge } from "@/lib/db/payments";
import { grossUpAmount } from "@/lib/stripe";
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
  return NextResponse.json({ paymentLink: hit.link, feePreview });
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
  const breakdown = grossUpAmount(net);
  const payerEmail = String(body.email || "").trim().toLowerCase();
  const payerName = String(body.name || "").trim();
  await recordPaymentLinkCharge({
    studioId: hit.studioId,
    linkId: id,
    ...breakdown,
  });
  await notifyStudio({
    studioId: hit.studioId,
    type: "payment_received",
    title: "Payment received",
    body: `${hit.link.title}: $${breakdown.netAmount.toFixed(2)} net (client paid $${breakdown.grossAmount.toFixed(2)})`,
    href: "/admin/payments",
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
    transactionId: nanoid(),
    ...breakdown,
  });
}
