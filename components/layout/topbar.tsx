import { signOut } from "@/app/(auth)/login/actions";

interface TopbarProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function Topbar({ title, subtitle, action }: TopbarProps) {
  return (
    <header
      style={{
        height: "56px",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 1.5rem",
        background: "var(--surface)",
        flexShrink: 0,
      }}
    >
      <div>
        <h1
          style={{
            fontSize: "0.9375rem",
            fontWeight: 600,
            color: "var(--text-primary)",
            lineHeight: 1.2,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "1px" }}>
            {subtitle}
          </p>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        {action}
        <form action={signOut}>
          <button
            type="submit"
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              padding: "0.375rem 0.75rem",
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
