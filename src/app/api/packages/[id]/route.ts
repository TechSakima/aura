import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { updateStudioDb } from "@/lib/db/store";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json();

  const pkg = await updateStudioDb(admin.studioId, (db) => {
    const p = db.packageTemplates.find((x) => x.id === id);
    if (!p) return null;
    Object.assign(p, {
      ...("name" in body ? { name: body.name } : {}),
      ...("defaultPricing" in body ? { defaultPricing: body.defaultPricing } : {}),
      ...("contractTerms" in body ? { contractTerms: body.contractTerms } : {}),
      ...("inclusions" in body ? { inclusions: body.inclusions } : {}),
      ...("intakeQuestions" in body ? { intakeQuestions: body.intakeQuestions } : {}),
      updatedAt: new Date().toISOString(),
    });
    return p;
  });

  if (!pkg) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ package: pkg });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  await updateStudioDb(admin.studioId, (db) => {
    db.packageTemplates = db.packageTemplates.filter((p) => p.id !== id);
  });
  return NextResponse.json({ ok: true });
}
