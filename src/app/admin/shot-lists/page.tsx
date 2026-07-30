import { redirect } from "next/navigation";

/** Legacy URL — shot lists live under Library (AURA-062 / AURA-065). */
export default function ShotListsPage() {
  redirect("/admin/prep?tab=shots");
}
