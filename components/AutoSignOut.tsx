"use client";

import { useEffect } from "react";

/**
 * Fires a beacon to /api/auth/signout when the page/iframe truly unloads.
 * Guards against false positives in Google Sites iframes where pagehide
 * can fire during in-app client-side navigations.
 *
 * pagehide fires when:
 *  - The browser tab or window is closed                        → sign out ✓
 *  - The parent Google Sites page navigates away (kills iframe) → sign out ✓
 *  - The page enters bfcache (persisted=true)                   → ignored  ✗
 *  - In-app navigation within the first 2s of mount             → ignored  ✗
 */
export function AutoSignOut() {
  useEffect(() => {
    // Arm after 2 seconds — ignores pagehide artifacts from fast
    // in-app navigations that some iframe environments fire spuriously.
    let armed = false;
    const armTimer = setTimeout(() => {
      armed = true;
    }, 2000);

    const handlePageHide = (event: PageTransitionEvent) => {
      // persisted=true → page going into bfcache, not being destroyed.
      if (event.persisted) return;
      // Not yet armed → this is a navigation artifact, not a real exit.
      if (!armed) return;
      navigator.sendBeacon("/api/auth/signout");
    };

    window.addEventListener("pagehide", handlePageHide);
    return () => {
      clearTimeout(armTimer);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, []);

  return null;
}
