import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { completeOnboarding } from "./actions";

export default async function OnboardingPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // If they already have a users row, send them to dashboard
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (existing) redirect("/dashboard");

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--background)",
        padding: "1.5rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div aria-hidden style={{
        position: "fixed", inset: 0,
        background:
          "radial-gradient(ellipse 80% 60% at 60% 10%, #3d2a1828 0%, transparent 55%), " +
          "radial-gradient(ellipse 60% 50% at 15% 90%, #3a1c1a22 0%, transparent 50%)",
        pointerEvents: "none",
      }} />

      <div style={{ width: "100%", maxWidth: "420px", position: "relative", zIndex: 1 }}>
        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderTop: "1px solid var(--border-accent)",
          borderRadius: "2px",
          padding: "2.75rem 2.25rem 2.25rem",
          boxShadow: "0 0 0 1px #bb7b3d08, 0 24px 64px #00000060, 0 4px 16px #00000040",
        }}>
          {/* Emblem */}
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: "56px", height: "56px",
              background: "var(--surface-deep)",
              border: "1px solid var(--accent)",
              borderRadius: "2px", fontSize: "20px",
              marginBottom: "1.375rem", color: "var(--accent)",
              transform: "rotate(45deg)",
              boxShadow: "0 0 20px var(--accent-glow), inset 0 0 12px #bb7b3d12",
            }}>
              <span style={{ transform: "rotate(-45deg)", display: "block" }}>✦</span>
            </div>
            <h1 style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "1.4375rem", fontWeight: 700,
              color: "var(--text-primary)", letterSpacing: "0.015em",
              marginBottom: "0.375rem", lineHeight: 1.2,
            }}>
              Welcome to Grant Engine
            </h1>
            <p style={{
              fontSize: "0.625rem", color: "var(--text-muted)",
              letterSpacing: "0.12em", textTransform: "uppercase",
              fontFamily: "Inter, system-ui, sans-serif",
            }}>
              Complete your profile to get started
            </p>
          </div>

          <form action={completeOnboarding} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4375rem" }}>
              <label htmlFor="full_name" style={{
                fontFamily: "Inter, system-ui, sans-serif",
                fontSize: "0.625rem", fontWeight: 600,
                color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em",
              }}>
                Your Full Name
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                required
                autoFocus
                placeholder="First Last"
                style={{
                  background: "var(--surface-deep)",
                  border: "1px solid var(--border)",
                  borderRadius: "2px",
                  padding: "0.625rem 0.875rem",
                  fontSize: "0.875rem",
                  color: "var(--text-primary)",
                  outline: "none",
                  width: "100%",
                  fontFamily: "Inter, system-ui, sans-serif",
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                marginTop: "0.25rem",
                background: "var(--accent)", color: "#efe8d6",
                border: "none", borderRadius: "2px",
                padding: "0.75rem 1rem",
                fontSize: "0.6875rem", fontWeight: 700,
                letterSpacing: "0.12em", textTransform: "uppercase",
                cursor: "pointer", width: "100%",
                fontFamily: "Inter, system-ui, sans-serif",
                boxShadow: "0 2px 12px #bb7b3d30",
              }}
            >
              Enter Grant Engine →
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
