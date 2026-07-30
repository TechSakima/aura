import { redirect } from "next/navigation";

/** Legacy URL — quote packages live under Library (AURA-062 / AURA-065). */
export default function PackagesPage() {
  redirect("/admin/prep?tab=packages");
}
