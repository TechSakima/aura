import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth";
import { readStudioDb, updateStudioDb } from "@/lib/db/store";
import {
  createPaymentLinkCheckout,
  getStripe,
  grossUpAmount,
} from "@/lib/stripe";
import { absoluteUrl } from "@/lib/notify/send";
import { studioPaymentDefaults } from "@/lib/payment-defaults";
import type { Invoice, PaymentLinkTemplate } from "@/lib/types";

/** Create a project deposit invoice and optional Stripe Checkout URL. */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: projectId } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const db = await readStudioDb(admin.studioId);
  const project = db.projects.find((p) => p.id === projectId);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const booking = db.bookingRequests.find((r) => r.projectId === projectId);
  const sessionType = booking
    ? db.sessionTypes.find((t) => t.id === booking.sessionTypeId)
    : db.sessionTypes.find(
        (t) => t.name.toLowerCase() === (project.type || "").toLowerCase(),
      ) || db.sessionTypes.find((t) => t.active);

  const fromBody =
    body.amount !== undefined && body.amount !== null && body.amount !== ""
      ? Number(body.amount)
      : undefined;
  const paymentDefaults = studioPaymentDefaults(db.studio);
  const netAmount =
    fromBody !== undefined && Number.isFinite(fromBody) && fromBody > 0
      ? fromBody
      : sessionType?.depositAmount ??
        sessionType?.basePrice ??
        paymentDefaults.defaultDepositAmount ??
        undefined;

  if (netAmount == null || netAmount <= 0) {
    return NextResponse.json(
      { error: "Enter a deposit amount" },
      { status: 400 },
    );
  }

  const { netAmount: net, processingFee, grossAmount } = grossUpAmount(netAmount);
  const now = new Date().toISOString();
  const invoice: Invoice = {
    id: nanoid(),
    studioId: admin.studioId,
    projectId,
    title: `Deposit — ${project.name}`,
    netAmount: net,
    processingFee,
    grossAmount,
    status: "upcoming",
    createdAt: now,
    updatedAt: now,
  };

  const linkId = nanoid();
  const paymentLink: PaymentLinkTemplate = {
    id: linkId,
    studioId: admin.studioId,
    title: invoice.title,
    description: `Deposit for ${project.name}`,
    mode: "fixed",
    amount: net,
    active: true,
    publicUrl: absoluteUrl(`/pay/${linkId}`),
    projectId,
    createdAt: now,
    updatedAt: now,
  };

  await updateStudioDb(admin.studioId, (d) => {
    d.invoices.unshift(invoice);
    d.paymentLinks.unshift(paymentLink);
    const p = d.projects.find((x) => x.id === projectId);
    if (p) {
      if (p.workflowStep !== "deposit") {
        p.workflowStep = "deposit";
      }
      p.updatedAt = now;
    }
    for (const prop of d.proposals.filter((x) => x.projectId === projectId)) {
      if (prop.depositStatus === "none") prop.depositStatus = "awaited";
    }
  });

  let checkoutUrl: string | undefined;
  let sessionId: string | undefined;

  if (
    getStripe() &&
    db.studio.stripeAccountId &&
    db.studio.stripeOnboardingComplete
  ) {
    try {
      const checkout = await createPaymentLinkCheckout({
        stripeAccountId: db.studio.stripeAccountId,
        paymentLinkId: linkId,
        studioId: admin.studioId,
        title: invoice.title,
        description: paymentLink.description,
        netAmount: net,
        customerEmail: project.email || undefined,
        customerName: project.name || undefined,
        projectId,
        studioName: db.studio.name,
      });
      if (checkout?.session.url) {
        checkoutUrl = checkout.session.url;
        sessionId = checkout.session.id;
        await updateStudioDb(admin.studioId, (d) => {
          const inv = d.invoices.find((x) => x.id === invoice.id);
          if (inv) {
            inv.stripeCheckoutSessionId = sessionId;
            inv.updatedAt = new Date().toISOString();
          }
        });
      }
    } catch (e) {
      console.error("[projects/deposit] checkout failed", e);
    }
  }

  return NextResponse.json({
    invoice: {
      ...invoice,
      stripeCheckoutSessionId: sessionId,
    },
    paymentLink,
    checkoutUrl: checkoutUrl || paymentLink.publicUrl,
    payUrl: paymentLink.publicUrl,
    feePreview: { netAmount: net, processingFee, grossAmount },
    workflowStep: "deposit" as const,
  });
}
