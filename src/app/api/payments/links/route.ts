import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth";
import { readStudioDb, updateStudioDb } from "@/lib/db/store";
import { grossUpAmount } from "@/lib/stripe";
import { absoluteUrl } from "@/lib/notify/send";
import type { PaymentLinkMode, PaymentLinkTemplate } from "@/lib/types";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await readStudioDb(admin.studioId);
  return NextResponse.json({
    paymentLinks: db.paymentLinks.map((l) => ({
      ...l,
      publicUrl: absoluteUrl(`/pay/${l.id}`),
    })),
    invoices: db.invoices,
    transactions: db.paymentTransactions,
  });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const title = String(body.title || "").trim();
  if (!title) {
    return NextResponse.json({ error: "Title required" }, { status: 400 });
  }
  const mode = (body.mode === "customer_chooses" ? "customer_chooses" : "fixed") as PaymentLinkMode;
  const amount = typeof body.amount === "number" ? body.amount : Number(body.amount) || 0;
  const now = new Date().toISOString();
  const id = nanoid();
  const breakdown = mode === "fixed" ? grossUpAmount(amount) : null;
  const link: PaymentLinkTemplate = {
    id,
    studioId: admin.studioId,
    title,
    description: body.description ? String(body.description) : undefined,
    mode,
    amount: mode === "fixed" ? amount : undefined,
    minAmount: mode === "customer_chooses" ? Number(body.minAmount) || 1 : undefined,
    maxAmount: mode === "customer_chooses" ? Number(body.maxAmount) || 500 : undefined,
    active: true,
    publicUrl: absoluteUrl(`/pay/${id}`),
    createdAt: now,
    updatedAt: now,
  };
  await updateStudioDb(admin.studioId, (db) => {
    db.paymentLinks.unshift(link);
  });
  return NextResponse.json({ paymentLink: link, feePreview: breakdown });
}
