import { redirect } from "next/navigation";

/** Legacy → project detail (AURA-063). */
export default async function ClientDetailRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/projects/${id}`);
}
