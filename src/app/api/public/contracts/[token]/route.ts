import { NextResponse } from "next/server";
import { COL } from "@/lib/db/collections";
import { assertFirebaseReady } from "@/lib/db/require-firebase";
import { getStudioDoc, readStudioDb, updateStudioDb } from "@/lib/db/store";
import {
  emailContractSignedCopy,
  notifyStudio,
} from "@/lib/notify/send";

import type { Contract } from "@/lib/types";

async function findContract(token: string) {
  const { db } = assertFirebaseReady();
  await getStudioDoc("noop").catch(() => null);
  const snap = await db
    .collection(COL.contracts)
    .where("token", "==", token)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const d = snap.docs[0]!;
  return { id: d.id, ...d.data() } as Contract;
}

function parseSignedDate(raw: unknown): string | null {
  const s = String(raw || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return s;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const contract = await findContract(token);
  if (!contract) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const studio = await getStudioDoc(contract.studioId);
  return NextResponse.json({
    contract: {
      title: contract.title,
      body: contract.body,
      status: contract.status,
      signerName: contract.signerName,
      signedAt: contract.signedAt,
      signedDate: contract.signedDate,
      acknowledgedTerms: contract.acknowledgedTerms,
    },
    studio: { name: studio?.name },
  });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const body = await req.json();
  const signerName = String(body.signerName || "").trim();
  if (!signerName) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }
  if (!body.acknowledgedTerms) {
    return NextResponse.json(
      { error: "Acknowledgment required" },
      { status: 400 },
    );
  }
  const signedDate = parseSignedDate(body.signedDate);
  if (!signedDate) {
    return NextResponse.json({ error: "Valid date required" }, { status: 400 });
  }

  const contract = await findContract(token);
  if (!contract) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (contract.status === "completed") {
    return NextResponse.json({ error: "Already signed" }, { status: 400 });
  }
  const signedAt = new Date().toISOString();
  await updateStudioDb(contract.studioId, (db) => {
    const c = db.contracts.find((x) => x.id === contract.id);
    if (!c) return;
    c.status = "completed";
    c.signerName = signerName;
    c.signedAt = signedAt;
    c.signedDate = signedDate;
    c.acknowledgedTerms = true;
    c.updatedAt = signedAt;
    const p = db.projects.find((x) => x.id === c.projectId);
    if (p) {
      p.workflowStep = "deposit";
      p.updatedAt = signedAt;
    }
  });
  await notifyStudio({
    studioId: contract.studioId,
    type: "contract_signed",
    title: "Contract signed",
    body: `${contract.title} signed by ${signerName}`,
    href: `/admin/projects/${contract.projectId}`,
  });

  const db = await readStudioDb(contract.studioId);
  const project = db.projects.find((p) => p.id === contract.projectId);
  if (project?.email) {
    await emailContractSignedCopy({
      studioId: contract.studioId,
      to: project.email,
      clientName: project.name,
      title: contract.title,
      body: contract.body,
      signerName,
      signedDate,
      token,
    });
  }

  return NextResponse.json({ ok: true, signedAt, signedDate });
}
