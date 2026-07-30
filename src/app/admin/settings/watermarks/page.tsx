import { redirect } from "next/navigation";

/** Watermark CRUD lives under Delivery (AURA-335). */
export default function SettingsWatermarksPage() {
  redirect("/admin/settings/delivery#watermarks");
}
