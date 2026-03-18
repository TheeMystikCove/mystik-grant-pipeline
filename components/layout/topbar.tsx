import { UserMenu } from "./UserMenu";

interface TopbarProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function Topbar({ title, subtitle, action }: TopbarProps) {
  return (
    <header
      style={{
        height: "58px",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 1.75rem",
        background: "var(--surface)",
        flexShrink: 0,
        position: "relative",
      }}
    >
      {/* Subtle bottom accent line */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          bottom: 0,
          left: "1.75rem",
          right: "1.75rem",
          height: "1px",
          background:
            "linear-gradient(to right, transparent, var(--border-accent) 30%, var(--border-accent) 70%, transparent)",
          opacity: 0.25,
          pointerEvents: "none",
        }}
      />

      {/* Title block */}
      <div style={{ display: "flex", alignItems: "baseline", gap: "0.875rem" }}>
        <h1
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: "1rem",
            fontWeight: 700,
            color: "var(--text-primary)",
            lineHeight: 1,
            letterSpacing: "0.01em",
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <>
            <span
              style={{
                fontSize: "0.4375rem",
                color: "var(--ornament)",
                lineHeight: 1,
              }}
            >
              ◆
            </span>
            <p
              style={{
                fontSize: "0.6875rem",
                color: "var(--text-muted)",
                fontFamily: "Inter, system-ui, sans-serif",
                letterSpacing: "0.04em",
              }}
            >
              {subtitle}
            </p>
          </>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        {action}
        <UserMenu />
      </div>
    </header>
  );
}
