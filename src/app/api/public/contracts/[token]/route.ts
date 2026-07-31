import { NextResponse } from "next/server";
import { recordEvent } from "@/lib/analytics";
import { COL } from "@/lib/db/collections";
import {
  findContractByToken,
  getProjectById,
  getProjectBundle,
  getStudioDoc,
  patchStudioDoc,
} from "@/lib/db/store";
import {
  emailContractSignedCopy,
  notifyStudio,
} from "@/lib/notify/send";
import { assertPublicContractAccess } from "@/lib/public-access";
import { clientIp, rateLimitShared } from "@/lib/rate-limit";
import { workflowStepAfterContractSigned } from "@/lib/workflow/state-rules";

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
  const contract = await findContractByToken(token);
  if (!contract) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const access = await assertPublicContractAccess(contract);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }
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
    preview: access.preview,
  });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const limited = await rateLimitShared(
    `contract-sign:${token}:${clientIp(req)}`,
    6,
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

  const contract = await findContractByToken(token);
  if (!contract) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const access = await assertPublicContractAccess(contract, { sign: true });
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }
  const signedAt = new Date().toISOString();
  await patchStudioDoc(COL.contracts, contract.id, {
    status: "completed",
    signerName,
    signedAt,
    signedDate,
    acknowledgedTerms: true,
  });
  const project = contract.projectId
    ? await getProjectById(contract.projectId)
    : null;
  const nextStep = workflowStepAfterContractSigned(project?.workflowStep);
  if (contract.projectId && nextStep) {
    await patchStudioDoc(COL.projects, contract.projectId, {
      workflowStep: nextStep,
    });
  }
  let sessionId: string | undefined;
  if (contract.projectId) {
    const bundle = await getProjectBundle(contract.projectId).catch(() => null);
    const sessions = bundle?.sessions || [];
    sessionId =
      sessions.find((s) => s.status !== "archived")?.id || sessions[0]?.id;
  }

  await recordEvent({
    type: "contract_signed",
    studioId: contract.studioId,
    projectId: contract.projectId,
    sessionId,
    meta: { contractId: contract.id },
  });

  await notifyStudio({
    studioId: contract.studioId,
    type: "contract_signed",
    title: "Contract signed",
    body: `${contract.title} signed by ${signerName}`,
    href: `/admin/projects/${contract.projectId}#workflow`,
  });
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
      projectId: contract.projectId,
    });
  }

  return NextResponse.json({ ok: true, signedAt, signedDate });
}
