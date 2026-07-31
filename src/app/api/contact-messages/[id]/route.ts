import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getContactMessage } from "@/lib/email-outbox";
import { contactSourceLabel } from "@/lib/public-contact-server";

/** Prefill New project from a contact message (AURA-421). */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const message = await getContactMessage(id);
  if (!message || message.studioId !== admin.studioId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    id: message.id,
    name: message.name,
    email: message.email,
    phone: message.phone,
    message: message.message,
    context: message.context,
    source: contactSourceLabel(message.source),
    projectId: message.projectId,
  });
}
