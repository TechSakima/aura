import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { readStudioDb, updateStudioDb } from "@/lib/db/store";
import {
  createConnectAccount,
  createConnectOnboardingLink,
  getStripe,
  stripeConfigured,
  stripeErrorMessage,
} from "@/lib/stripe";

export const runtime = "nodejs";

/** Stripe Connect onboarding status. */
export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const db = await readStudioDb(admin.studioId);
    return NextResponse.json({
      stripeConfigured: stripeConfigured(),
      accountId: db.studio.stripeAccountId || null,
      onboardingComplete: Boolean(db.studio.stripeOnboardingComplete),
    });
  } catch (e) {
    console.error("[payments/connect GET]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "onboard");
    const stripe = getStripe();
    const origin = (
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000"
    ).replace(/\/$/, "");

    if (action === "disconnect") {
      await updateStudioDb(admin.studioId, (db) => {
        db.studio.stripeAccountId = undefined;
        db.studio.stripeOnboardingComplete = false;
      });
      return NextResponse.json({ ok: true });
    }

    if (!stripe) {
      return NextResponse.json(
        {
          error:
            "Stripe is not configured. Set STRIPE_SECRET_KEY in App Hosting env.",
        },
        { status: 503 },
      );
    }

    const db = await readStudioDb(admin.studioId);
    let accountId = db.studio.stripeAccountId;

    // Drop invalid local stub ids from earlier stub mode
    if (accountId?.startsWith("acct_local_")) {
      accountId = undefined;
      await updateStudioDb(admin.studioId, (d) => {
        d.studio.stripeAccountId = undefined;
        d.studio.stripeOnboardingComplete = false;
      });
    }

    if (!accountId) {
      const account = await createConnectAccount({
        email: db.studio.ownerEmail,
        studioId: admin.studioId,
      });
      accountId = account.id;
      await updateStudioDb(admin.studioId, (d) => {
        d.studio.stripeAccountId = accountId!;
        d.studio.stripeOnboardingComplete = false;
      });
    }

    const link = await createConnectOnboardingLink({
      accountId,
      refreshUrl: `${origin}/admin/payments?connect=refresh`,
      returnUrl: `${origin}/admin/payments?connect=return`,
    });

    return NextResponse.json({ url: link.url, accountId });
  } catch (e) {
    const message = stripeErrorMessage(e);
    console.error("[payments/connect POST]", message, e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Refresh onboarding status after return from Stripe. */
export async function PUT() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const stripe = getStripe();
    const db = await readStudioDb(admin.studioId);
    if (!stripe || !db.studio.stripeAccountId) {
      return NextResponse.json({
        onboardingComplete: Boolean(db.studio.stripeOnboardingComplete),
      });
    }
    const account = await stripe.accounts.retrieve(db.studio.stripeAccountId);
    const complete = Boolean(
      account.charges_enabled && account.details_submitted,
    );
    await updateStudioDb(admin.studioId, (d) => {
      d.studio.stripeOnboardingComplete = complete;
    });
    return NextResponse.json({
      onboardingComplete: complete,
      chargesEnabled: account.charges_enabled,
      detailsSubmitted: account.details_submitted,
    });
  } catch (e) {
    const message = stripeErrorMessage(e);
    console.error("[payments/connect PUT]", message, e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
