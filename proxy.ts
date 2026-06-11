import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  resolveGrantSurface,
  resolveGrantTier,
  resolveAccess,
  surfaceRequiresProfileCheck,
} from "@/lib/nexis/surface-gate";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/auth",
  "/reset-password",
  "/unauthorized",
  "/invite",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            // SameSite=None + Secure required for cookies to work inside iframes
            // (e.g. embedded in Google Sites / intranet pages on a different domain)
            supabaseResponse.cookies.set(name, value, {
              ...options,
              sameSite: "none",
              secure: true,
            })
          );
        },
      },
    }
  );

  // getUser() makes a network request to Supabase to validate the session.
  // Only redirect to login when the session is definitively missing —
  // not on transient network errors (Supabase down, project paused, etc.).
  let user = null;
  let enforceAuth = true;

  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error) {
      // Clean result — user is either authenticated or definitively null
      user = data.user;
    } else if (error.name === "AuthSessionMissingError") {
      // No session cookie present — definitely not logged in
      user = null;
    } else {
      // Network error, Supabase unavailable, etc. — don't kick out users
      enforceAuth = false;
    }
  } catch {
    // Unexpected error — allow through to avoid hard boot loops
    enforceAuth = false;
  }

  // Public paths pass through without auth or gate checks
  if (isPublic) {
    if (user && pathname === "/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Unauthenticated: API routes return 401 JSON; page routes redirect to login
  if (enforceAuth && !user) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // ── NEXIS Surface Gate ─────────────────────────────────────────────────────
  // Tier enforcement for staff/admin/backend surfaces. Applicant-facing surfaces
  // (companion, dashboard, document upload, status) are open to all authenticated
  // users — surfaceRequiresProfileCheck returns false for them and the gate skips.
  //
  // NOTE: grant-engine has no role column yet, so resolveGrantTier defaults all
  // authenticated users to ADMIN_OPERATIONS — preserving current single-org
  // staff behaviour where every authenticated user is trusted. When the role
  // column lands (Phase 1 multi-tenant), tighten the default to MEMBER and map
  // real roles in resolveGrantTier(). See lib/nexis/surface-gate.ts.
  if (user) {
    const surface = resolveGrantSurface(pathname);
    if (surfaceRequiresProfileCheck(surface)) {
      const tier = resolveGrantTier(undefined);
      const access = resolveAccess(tier, surface);

      if (access.decision === "deny") {
        if (pathname.startsWith("/api/")) {
          return NextResponse.json(
            { error: "Forbidden", reason: access.reason, nexis_tier: tier, surface },
            { status: 403 }
          );
        }
        return NextResponse.redirect(new URL("/unauthorized", request.url));
      }
    }
  }
  // ── End NEXIS Surface Gate ─────────────────────────────────────────────────

  return supabaseResponse;
}

export default proxy;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
