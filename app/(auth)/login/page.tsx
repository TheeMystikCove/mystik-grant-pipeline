import { signIn } from "./actions";

export default function LoginPage() {
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
      }}
    >
      {/* Warm radial depth */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          background:
            "radial-gradient(ellipse at 65% 15%, #3d2a1820 0%, transparent 60%), " +
            "radial-gradient(ellipse at 20% 85%, #3a1c1a18 0%, transparent 55%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ width: "100%", maxWidth: "380px", position: "relative", zIndex: 1 }}>
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "2.25rem 2rem",
          }}
        >
          {/* Emblem */}
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "44px",
                height: "44px",
                background: "var(--accent-muted)",
                border: "1px solid var(--accent)",
                borderRadius: "6px",
                fontSize: "18px",
                marginBottom: "1rem",
                color: "var(--accent)",
                transform: "rotate(45deg)",
              }}
            >
              <span style={{ transform: "rotate(-45deg)", display: "block" }}>✦</span>
            </div>
            <h1
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: "1.1875rem",
                fontWeight: 700,
                color: "var(--text-primary)",
                letterSpacing: "0.02em",
                marginBottom: "0.25rem",
              }}
            >
              Mystik Grant Engine
            </h1>
            <p
              style={{
                fontSize: "0.6875rem",
                color: "var(--text-muted)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              Thee Mystik Universal Holdings
            </p>
          </div>

          {/* Ornamental divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.625rem",
              marginBottom: "1.75rem",
            }}
          >
            <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
            <span style={{ fontSize: "0.5rem", color: "var(--text-muted)" }}>◆</span>
            <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
          </div>

          {/* Form */}
          <form action={signIn} style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              <label
                htmlFor="email"
                style={{
                  fontFamily: "Inter, system-ui, sans-serif",
                  fontSize: "0.6875rem",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                }}
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@mystikholdings.org"
                style={{
                  background: "var(--surface-raised)",
                  border: "1px solid var(--border)",
                  borderRadius: "5px",
                  padding: "0.5625rem 0.75rem",
                  fontSize: "0.875rem",
                  color: "var(--text-primary)",
                  outline: "none",
                  width: "100%",
                  fontFamily: "Inter, system-ui, sans-serif",
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              <label
                htmlFor="password"
                style={{
                  fontFamily: "Inter, system-ui, sans-serif",
                  fontSize: "0.6875rem",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                }}
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                style={{
                  background: "var(--surface-raised)",
                  border: "1px solid var(--border)",
                  borderRadius: "5px",
                  padding: "0.5625rem 0.75rem",
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
                marginTop: "0.375rem",
                background: "var(--accent)",
                color: "var(--text-primary)",
                border: "none",
                borderRadius: "5px",
                padding: "0.6875rem 1rem",
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                cursor: "pointer",
                width: "100%",
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              Enter the Engine
            </button>
          </form>

          <p
            style={{
              marginTop: "1.5rem",
              textAlign: "center",
              fontSize: "0.6875rem",
              color: "var(--text-muted)",
              fontFamily: "Inter, system-ui, sans-serif",
            }}
          >
            Access by invitation only.
          </p>
        </div>
      </div>
    </div>
  );
}
