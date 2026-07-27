import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth";
import { readStudioDb, updateStudioDb } from "@/lib/db/store";
import { grossUpAmount } from "@/lib/stripe";
import { absoluteUrl, emailPaymentLink } from "@/lib/notify/send";
import type { PaymentLinkMode, PaymentLinkTemplate } from "@/lib/types";

function publicLinkUrl(id: string) {
  return absoluteUrl(`/pay/${id}`);
}

function withPublicUrl(link: PaymentLinkTemplate) {
  return {
    ...link,
    publicUrl: link.publicUrl || publicLinkUrl(link.id),
  };
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await readStudioDb(admin.studioId);
  return NextResponse.json({
    paymentLinks: db.paymentLinks
      .filter((l) => !l.archived)
      .map(withPublicUrl),
    invoices: db.invoices,
    transactions: db.paymentTransactions,
  });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  if (body.action === "email") {
    const id = String(body.id || body.paymentLinkId || "");
    const to = String(body.email || body.to || "")
      .trim()
      .toLowerCase();
    if (!id || !to) {
      return NextResponse.json(
        { error: "id and email required" },
        { status: 400 },
      );
    }
    const db = await readStudioDb(admin.studioId);
    const link = db.paymentLinks.find((l) => l.id === id && !l.archived);
    if (!link) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const project = link.projectId
      ? db.projects.find((p) => p.id === link.projectId)
      : undefined;
    const result = await emailPaymentLink({
      studioId: admin.studioId,
      to,
      clientName: project?.name,
      title: link.title,
      paymentLinkId: link.id,
      publicUrl: link.publicUrl || publicLinkUrl(link.id),
    });
    if (!result.ok && "skipped" in result && result.skipped) {
      return NextResponse.json({
        ok: true,
        emailed: false,
        reason: "prefs_or_missing_key",
      });
    }
    if (!result.ok) {
      return NextResponse.json(
        { error: "error" in result ? result.error : "Send failed" },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true, emailed: true });
  }

  const title = String(body.title || "").trim();
  if (!title) {
    return NextResponse.json({ error: "Title required" }, { status: 400 });
  }
  const mode = (body.mode === "customer_chooses"
    ? "customer_chooses"
    : "fixed") as PaymentLinkMode;
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
    publicUrl: publicLinkUrl(id),
    projectId: body.projectId ? String(body.projectId) : undefined,
    createdAt: now,
    updatedAt: now,
  };
  await updateStudioDb(admin.studioId, (db) => {
    db.paymentLinks.unshift(link);
  });
  return NextResponse.json({ paymentLink: link, feePreview: breakdown });
}

export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const id = String(body.id || "");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const updated = await updateStudioDb(admin.studioId, (db) => {
    const link = db.paymentLinks.find((l) => l.id === id);
    if (!link || link.archived) return null;
    const now = new Date().toISOString();
    if (body.title != null) {
      const title = String(body.title).trim();
      if (title) link.title = title;
    }
    if (body.description != null) {
      const desc = String(body.description).trim();
      link.description = desc || undefined;
    }
    if (body.mode === "fixed" || body.mode === "customer_chooses") {
      link.mode = body.mode;
    }
    if (body.amount != null || link.mode === "fixed") {
      const amount =
        typeof body.amount === "number" ? body.amount : Number(body.amount);
      if (Number.isFinite(amount) && amount >= 0) {
        link.amount = amount;
      }
    }
    if (body.minAmount != null) {
      link.minAmount = Number(body.minAmount) || link.minAmount;
    }
    if (body.maxAmount != null) {
      link.maxAmount = Number(body.maxAmount) || link.maxAmount;
    }
    if (typeof body.active === "boolean") {
      link.active = body.active;
    }
    if ("projectId" in body) {
      const projectId = body.projectId ? String(body.projectId) : undefined;
      link.projectId = projectId || undefined;
    }
    if (link.mode === "fixed") {
      link.minAmount = undefined;
      link.maxAmount = undefined;
    } else {
      link.amount = undefined;
      if (link.minAmount == null) link.minAmount = 1;
      if (link.maxAmount == null) link.maxAmount = 500;
    }
    link.publicUrl = publicLinkUrl(link.id);
    link.updatedAt = now;
    return withPublicUrl(link);
  });

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    paymentLink: updated,
    feePreview:
      updated.mode === "fixed" && updated.amount != null
        ? grossUpAmount(updated.amount)
        : null,
  });
}

export async function DELETE(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  let id = url.searchParams.get("id") || "";
  if (!id) {
    const body = await req.json().catch(() => ({}));
    id = String(body.id || "");
  }
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const archived = await updateStudioDb(admin.studioId, (db) => {
    const link = db.paymentLinks.find((l) => l.id === id);
    if (!link) return null;
    link.archived = true;
    link.active = false;
    link.updatedAt = new Date().toISOString();
    return withPublicUrl(link);
  });

  if (!archived) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, paymentLink: archived });
}
