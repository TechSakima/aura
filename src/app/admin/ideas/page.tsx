import { redirect } from "next/navigation";

/** Ideas merged into shot lists under Prep. */
export default function IdeasPage() {
  redirect("/admin/prep");
}
