import { redirect } from "next/navigation";

/** Legacy → projects (AURA-063). */
export default function ProposalsIndexRedirect() {
  redirect("/admin/projects");
}
