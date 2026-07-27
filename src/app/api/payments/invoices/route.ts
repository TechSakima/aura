import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth";
import { updateStudioDb } from "@/lib/db/store";
import { grossUpAmount } from "@/lib/stripe";
import type { Invoice } from "@/lib/types";

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const projectId = String(body.projectId || "");
  const net = Number(body.netAmount);
  if (!projectId || !net) {
    return NextResponse.json(
      { error: "projectId and netAmount required" },
      { status: 400 },
    );
  }
  const { netAmount, processingFee, grossAmount } = grossUpAmount(net);
  const now = new Date().toISOString();
  const invoice: Invoice = {
    id: nanoid(),
    studioId: admin.studioId,
    projectId,
    title: String(body.title || "Invoice"),
    netAmount,
    processingFee,
    grossAmount,
    status: "upcoming",
    dueAt: body.dueAt ? String(body.dueAt) : undefined,
    createdAt: now,
    updatedAt: now,
  };
  await updateStudioDb(admin.studioId, (db) => {
    db.invoices.unshift(invoice);
  });
  return NextResponse.json({ invoice });
}
