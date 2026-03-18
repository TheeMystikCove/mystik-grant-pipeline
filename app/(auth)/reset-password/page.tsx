import { updatePassword } from "./actions";

interface Props {
  searchParams: Promise<{ error?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { error } = await searchParams;

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
      {/* Atmospheric background */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          background:
            "radial-gradient(ellipse 80% 60% at 60% 10%, #3d2a1828 0%, transparent 55%), " +
            "radial-gradient(ellipse 60% 50% at 15% 90%, #3a1c1a22 0%, transparent 50%)",
          pointerEvents: "none",
        }}
      />
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
            boxShadow: "0 0 0 1px #bb7b3d08, 0 24px 64px #00000060, 0 4px 16px #00000040",
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
              Set New Passphrase
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
              Grant Engine · Password Recovery
            </p>
          </div>

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

          <form action={updatePassword} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <Field id="password" label="New Passphrase" type="password" placeholder="Min. 8 characters" />
            <Field id="confirm" label="Confirm Passphrase" type="password" placeholder="••••••••••••" />

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
              Update Passphrase
            </button>
          </form>

          <div style={{ marginTop: "1.875rem", display: "flex", alignItems: "center", gap: "0.625rem" }}>
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
              Password recovery
            </p>
            <div style={{ flex: 1, height: "1px", background: "var(--border-muted)" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ id, label, type, placeholder }: { id: string; label: string; type: string; placeholder: string }) {
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
        autoComplete="new-password"
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
          letterSpacing: "0.12em",
        }}
      />
    </div>
  );
}
