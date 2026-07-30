import { redirect } from "next/navigation";

/** Legacy client/shoot wizard → project/session (AURA-063). */
export default async function ClientShootRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; shootId: string }>;
  searchParams: Promise<{ step?: string | string[] }>;
}) {
  const { id, shootId } = await params;
  const sp = await searchParams;
  const stepRaw = sp.step;
  const step = Array.isArray(stepRaw) ? stepRaw[0] : stepRaw;
  const q = step ? `?step=${encodeURIComponent(step)}` : "";
  redirect(`/admin/projects/${id}/sessions/${shootId}${q}`);
}
