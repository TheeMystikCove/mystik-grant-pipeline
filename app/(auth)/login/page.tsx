import { signIn, signUp, resetPassword } from "./actions";

interface Props {
  searchParams: Promise<{ error?: string; success?: string; mode?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const { error, success, mode } = await searchParams;
  const isSignUp = mode === "signup";
  const isForgot = mode === "forgot";

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
      {/* Layered atmospheric depth */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          background:
            "radial-gradient(ellipse 80% 60% at 60% 10%, #3d2a1828 0%, transparent 55%), " +
            "radial-gradient(ellipse 60% 50% at 15% 90%, #3a1c1a22 0%, transparent 50%), " +
            "radial-gradient(ellipse 40% 40% at 85% 75%, #1a1208 0%, transparent 60%)",
          pointerEvents: "none",
        }}
      />

      {/* Horizontal ruled texture overlay */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 28px, #bb7b3d06 28px, #bb7b3d06 29px)",
          pointerEvents: "none",
        }}
      />

      <div style={{ width: "100%", maxWidth: "400px", position: "relative", zIndex: 1 }}>
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderTop: "1px solid var(--border-accent)",
            borderRadius: "2px",
            padding: "2.75rem 2.25rem 2.25rem",
            boxShadow:
              "0 0 0 1px #bb7b3d08, 0 24px 64px #00000060, 0 4px 16px #00000040",
          }}
        >
          {/* Emblem */}
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "56px",
                height: "56px",
                background: "var(--surface-deep)",
                border: "1px solid var(--accent)",
                borderRadius: "2px",
                fontSize: "20px",
                marginBottom: "1.375rem",
                color: "var(--accent)",
                transform: "rotate(45deg)",
                boxShadow: "0 0 20px var(--accent-glow), inset 0 0 12px #bb7b3d12",
              }}
            >
              <span style={{ transform: "rotate(-45deg)", display: "block" }}>✦</span>
            </div>

            <h1
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: "1.4375rem",
                fontWeight: 700,
                color: "var(--text-primary)",
                letterSpacing: "0.015em",
                marginBottom: "0.375rem",
                lineHeight: 1.2,
              }}
            >
              Grant Engine
            </h1>
            <p
              style={{
                fontSize: "0.625rem",
                color: "var(--text-muted)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              Thee Mystik Universal Holdings Corp.
            </p>
          </div>

          {/* Mode toggle */}
          <div
            style={{
              display: "flex",
              background: "var(--surface-deep)",
              border: "1px solid var(--border)",
              borderRadius: "2px",
              padding: "3px",
              marginBottom: "1.75rem",
              gap: "3px",
            }}
          >
            {[
              { label: "Sign In", href: "/login", active: !isSignUp && !isForgot },
              { label: "Create Account", href: "/login?mode=signup", active: isSignUp },
            ].map((tab) => (
              <a
                key={tab.label}
                href={tab.href}
                style={{
                  flex: 1,
                  textAlign: "center",
                  padding: "0.4375rem 0",
                  fontSize: "0.625rem",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  textDecoration: "none",
                  borderRadius: "1px",
                  fontFamily: "Inter, system-ui, sans-serif",
                  background: tab.active ? "var(--accent)" : "transparent",
                  color: tab.active ? "#efe8d6" : "var(--text-muted)",
                }}
              >
                {tab.label}
              </a>
            ))}
          </div>

          {/* Status messages */}
          {error && (
            <div
              style={{
                background: "var(--oxblood-muted)",
                border: "1px solid var(--oxblood)",
                borderRadius: "2px",
                padding: "0.625rem 0.875rem",
                marginBottom: "1.25rem",
                fontSize: "0.75rem",
                color: "#e8b4b2",
                fontFamily: "Inter, system-ui, sans-serif",
                lineHeight: 1.5,
              }}
            >
              {error}
            </div>
          )}

          {success && (
            <div
              style={{
                background: "#1a2e1a",
                border: "1px solid var(--success)",
                borderRadius: "2px",
                padding: "0.625rem 0.875rem",
                marginBottom: "1.25rem",
                fontSize: "0.75rem",
                color: "#a8c8a0",
                fontFamily: "Inter, system-ui, sans-serif",
                lineHeight: 1.5,
              }}
            >
              {success}
            </div>
          )}

          {/* Sign In Form */}
          {!isSignUp && !isForgot && (
            <form action={signIn} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <Field id="email" label="Email Address" type="email" placeholder="you@theemystikcove.com" />
              <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                <Field id="password" label="Passphrase" type="password" placeholder="••••••••••••" />
                <a
                  href="/login?mode=forgot"
                  style={{
                    alignSelf: "flex-end",
                    fontSize: "0.625rem",
                    color: "var(--text-muted)",
                    textDecoration: "none",
                    fontFamily: "Inter, system-ui, sans-serif",
                    letterSpacing: "0.04em",
                  }}
                >
                  Forgot passphrase?
                </a>
              </div>

              <button
                type="submit"
                style={{
                  marginTop: "0.5rem",
                  background: "var(--accent)",
                  color: "#efe8d6",
                  border: "none",
                  borderRadius: "2px",
                  padding: "0.75rem 1rem",
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  width: "100%",
                  fontFamily: "Inter, system-ui, sans-serif",
                  boxShadow: "0 2px 12px #bb7b3d30",
                }}
              >
                Enter the Sanctum
              </button>
            </form>
          )}

          {/* Forgot Password Form */}
          {isForgot && (
            <form action={resetPassword} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.6, fontFamily: "Inter, system-ui, sans-serif" }}>
                Enter your email address and we'll send you a link to reset your passphrase.
              </p>
              <Field id="email" label="Email Address" type="email" placeholder="you@theemystikcove.com" />
              <button
                type="submit"
                style={{
                  marginTop: "0.5rem",
                  background: "var(--accent)",
                  color: "#efe8d6",
                  border: "none",
                  borderRadius: "2px",
                  padding: "0.75rem 1rem",
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  width: "100%",
                  fontFamily: "Inter, system-ui, sans-serif",
                  boxShadow: "0 2px 12px #bb7b3d30",
                }}
              >
                Send Reset Link
              </button>
              <a
                href="/login"
                style={{
                  textAlign: "center",
                  fontSize: "0.625rem",
                  color: "var(--text-muted)",
                  textDecoration: "none",
                  fontFamily: "Inter, system-ui, sans-serif",
                  letterSpacing: "0.04em",
                }}
              >
                ← Back to Sign In
              </a>
            </form>
          )}

          {/* Create Account Form */}
          {isSignUp && (
            <form action={signUp} style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>
              <div
                style={{
                  background: "var(--surface-accent)",
                  border: "1px solid var(--border-accent)",
                  borderRadius: "2px",
                  padding: "0.625rem 0.875rem",
                  fontSize: "0.6875rem",
                  color: "var(--text-muted)",
                  fontFamily: "Inter, system-ui, sans-serif",
                  lineHeight: 1.5,
                }}
              >
                ◆ Access is restricted to{" "}
                <span style={{ color: "var(--accent)", fontWeight: 600 }}>
                  @theemystikcove.com
                </span>{" "}
                members only.
              </div>

              <Field id="email" label="Org Email Address" type="email" placeholder="you@theemystikcove.com" />
              <Field id="password" label="Create Passphrase" type="password" placeholder="Min. 8 characters" />
              <Field id="confirm" label="Confirm Passphrase" type="password" placeholder="••••••••••••" />

              <button
                type="submit"
                style={{
                  marginTop: "0.375rem",
                  background: "var(--accent)",
                  color: "#efe8d6",
                  border: "none",
                  borderRadius: "2px",
                  padding: "0.75rem 1rem",
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  width: "100%",
                  fontFamily: "Inter, system-ui, sans-serif",
                  boxShadow: "0 2px 12px #bb7b3d30",
                }}
              >
                Request Access
              </button>
            </form>
          )}

          {/* Footer */}
          <div
            style={{
              marginTop: "1.875rem",
              display: "flex",
              alignItems: "center",
              gap: "0.625rem",
            }}
          >
            <div style={{ flex: 1, height: "1px", background: "var(--border-muted)" }} />
            <p
              style={{
                fontSize: "0.5625rem",
                color: "var(--text-faint)",
                fontFamily: "Georgia, serif",
                fontStyle: "italic",
                letterSpacing: "0.05em",
                whiteSpace: "nowrap",
              }}
            >
              {isSignUp ? "Org members only" : isForgot ? "Password recovery" : "Access by invitation only"}
            </p>
            <div style={{ flex: 1, height: "1px", background: "var(--border-muted)" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Shared field component ───────────────────────────────────────────────────

function Field({
  id,
  label,
  type,
  placeholder,
}: {
  id: string;
  label: string;
  type: string;
  placeholder: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.4375rem" }}>
      <label
        htmlFor={id}
        style={{
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: "0.625rem",
          fontWeight: 600,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}
      >
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        required
        autoComplete={
          id === "confirm" ? "new-password" : type === "password" ? "current-password" : id
        }
        placeholder={placeholder}
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
          letterSpacing: type === "password" ? "0.12em" : "0.01em",
        }}
      />
    </div>
  );
}
