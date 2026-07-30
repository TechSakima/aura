"use client";

import { useEffect } from "react";
import { useToast } from "@/components/ui/toast";

/** Toast on online/offline transitions — admin + public (AURA-291). */
export function OfflineStatus() {
  const { push } = useToast();

  useEffect(() => {
    const onOffline = () => push("You’re offline", "danger");
    const onOnline = () => push("Back online", "neutral");
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [push]);

  return null;
}
