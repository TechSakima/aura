"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/ui";
import { SETTINGS_LAST_SECTION_KEY } from "@/lib/settings/nav";

/** Legacy /admin/settings/homepage → Website section (AURA-330). */
export default function SettingsHomepageRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_LAST_SECTION_KEY, "website");
    } catch {
      /* ignore */
    }
    router.replace("/admin/settings/website");
  }, [router]);

  return <EmptyState variant="loading" title="Opening website…" />;
}
