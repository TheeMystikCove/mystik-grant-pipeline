import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export { createClient as createServerClient };

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              // SameSite=None + Secure so cookies are sent inside cross-origin iframes
              cookieStore.set(name, value, {
                ...options,
                sameSite: "none",
                secure: true,
              })
            );
          } catch {
            // Called from a Server Component — cookies can't be set.
            // Middleware handles session refresh.
          }
        },
      },
    }
  );
}
