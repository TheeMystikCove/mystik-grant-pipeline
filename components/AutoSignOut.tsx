"use client";

import { useEffect } from "react";

/**
 * Fires a beacon to /api/auth/signout when the page/iframe unloads.
 * pagehide fires when:
 *  - The browser tab or window is closed
 *  - The parent Google Sites page navigates away (destroying the iframe)
 * It does NOT fire on client-side navigation within the app.
 */
export function AutoSignOut() {
  useEffect(() => {
    const handlePageHide = () => {
      navigator.sendBeacon("/api/auth/signout");
    };

    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, []);

  return null;
}
