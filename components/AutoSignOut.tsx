"use client";

import { useEffect, useRef } from "react";

/**
 * Fires a beacon to /api/auth/signout when the page/iframe truly unloads
 * AND the user has been inactive for at least 10 minutes.
 *
 * The inactivity check prevents false positives where pagehide fires
 * while the user is actively filling out forms (e.g. account settings),
 * switching tabs briefly, or triggering soft navigations in iframe environments.
 *
 * pagehide fires when:
 *  - The browser tab or window is closed                        → sign out ✓ (if inactive)
 *  - The parent Google Sites page navigates away (kills iframe) → sign out ✓ (if inactive)
 *  - The page enters bfcache (persisted=true)                   → ignored  ✗
 *  - User was recently active (< 10 min)                        → ignored  ✗
 */
export function AutoSignOut() {
  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    const INACTIVE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

    function trackActivity() {
      lastActivityRef.current = Date.now();
    }

    document.addEventListener("mousedown", trackActivity, { passive: true });
    document.addEventListener("keydown", trackActivity, { passive: true });
    document.addEventListener("touchstart", trackActivity, { passive: true });
    document.addEventListener("scroll", trackActivity, { passive: true });

    const handlePageHide = (event: PageTransitionEvent) => {
      // persisted=true → page going into bfcache, not being destroyed.
      if (event.persisted) return;
      // User was active recently — this is likely a false positive.
      const inactiveMs = Date.now() - lastActivityRef.current;
      if (inactiveMs < INACTIVE_THRESHOLD_MS) return;
      navigator.sendBeacon("/api/auth/signout");
    };

    window.addEventListener("pagehide", handlePageHide);
    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("mousedown", trackActivity);
      document.removeEventListener("keydown", trackActivity);
      document.removeEventListener("touchstart", trackActivity);
      document.removeEventListener("scroll", trackActivity);
    };
  }, []);

  return null;
}
