import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/invite"];

export async function proxy(request: NextRequest) {
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

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

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

  if (enforceAuth && !user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export default proxy;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
