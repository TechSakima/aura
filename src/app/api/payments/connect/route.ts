import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { readStudioDb, updateStudioDb } from "@/lib/db/store";
import { getStripe } from "@/lib/stripe";

/** Stripe Connect onboarding (Express). Stub-friendly when STRIPE_SECRET_KEY missing. */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await readStudioDb(admin.studioId);
  return NextResponse.json({
    stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
    accountId: db.studio.stripeAccountId || null,
    onboardingComplete: Boolean(db.studio.stripeOnboardingComplete),
  });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "onboard");
  const stripe = getStripe();
  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (action === "disconnect") {
    await updateStudioDb(admin.studioId, (db) => {
      db.studio.stripeAccountId = undefined;
      db.studio.stripeOnboardingComplete = false;
    });
    return NextResponse.json({ ok: true });
  }

  if (!stripe) {
    await updateStudioDb(admin.studioId, (db) => {
      db.studio.stripeAccountId = db.studio.stripeAccountId || `acct_local_${db.studio.id}`;
      db.studio.stripeOnboardingComplete = true;
    });
    return NextResponse.json({
      ok: true,
      stub: true,
      note: "STRIPE_SECRET_KEY not set — local Connect marked ready. Payment links still record fees locally.",
    });
  }

  const db = await readStudioDb(admin.studioId);
  let accountId = db.studio.stripeAccountId;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: db.studio.ownerEmail,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: { studioId: admin.studioId },
    });
    accountId = account.id;
    await updateStudioDb(admin.studioId, (d) => {
      d.studio.stripeAccountId = accountId!;
    });
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/admin/payments?connect=refresh`,
    return_url: `${origin}/admin/payments?connect=return`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: link.url, accountId });
}
