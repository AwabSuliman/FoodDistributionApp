"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { dashboardRealtimeTables } from "@/lib/dashboard-realtime";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

const REFRESH_DELAY_MS = 250;

export function LiveDashboardRefresh({ enabled }: { enabled: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleRefresh = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => router.refresh(), REFRESH_DELAY_MS);
    };

    let channel = supabase.channel("dashboard-live-updates");

    dashboardRealtimeTables.forEach((table) => {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        scheduleRefresh,
      );
    });

    channel.subscribe();

    return () => {
      clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [enabled, router]);

  return null;
}
