import { redirect } from "next/navigation";

/** Legacy → projects (AURA-063). */
export default function ClientsRedirectPage() {
  redirect("/admin/projects");
}
