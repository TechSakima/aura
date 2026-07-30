"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/ui";
import {
  SETTINGS_LAST_SECTION_KEY,
  isSettingsSectionId,
} from "@/lib/settings/nav";

export default function SettingsIndexPage() {
  const router = useRouter();

  useEffect(() => {
    let target = "/admin/settings/overview";
    try {
      let last = localStorage.getItem(SETTINGS_LAST_SECTION_KEY);
      if (last === "homepage") last = "website";
      if (last === "watermarks") last = "delivery";
      if (last && isSettingsSectionId(last)) {
        target = `/admin/settings/${last}`;
      }
    } catch {
      /* ignore */
    }
    router.replace(target);
  }, [router]);

  return <EmptyState variant="loading" title="Opening settings…" />;
}
