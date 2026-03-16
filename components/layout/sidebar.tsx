import Link from "next/link";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "⊞" },
  { href: "/opportunities", label: "Opportunities", icon: "◎" },
  { href: "/proposals", label: "Proposals", icon: "◈" },
];

export function Sidebar() {
  return (
    <aside
      style={{
        width: "220px",
        minHeight: "100vh",
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        padding: "1.25rem 0",
        flexShrink: 0,
      }}
    >
      {/* Wordmark */}
      <div
        style={{
          padding: "0 1.25rem 1.375rem",
          borderBottom: "1px solid var(--border-muted)",
          marginBottom: "0.875rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          <span
            style={{
              width: "28px",
              height: "28px",
              background: "var(--accent-muted)",
              border: "1px solid var(--accent)",
              borderRadius: "5px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "11px",
              color: "var(--accent)",
              flexShrink: 0,
              transform: "rotate(45deg)",
            }}
          >
            <span style={{ transform: "rotate(-45deg)", display: "block" }}>✦</span>
          </span>
          <div>
            <p
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: "0.8125rem",
                fontWeight: 700,
                color: "var(--text-primary)",
                lineHeight: 1.2,
                letterSpacing: "0.01em",
              }}
            >
              Grant Engine
            </p>
            <p
              style={{
                fontFamily: "Inter, system-ui, sans-serif",
                fontSize: "0.5625rem",
                color: "var(--text-muted)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginTop: "1px",
              }}
            >
              Mystik Holdings
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav
        style={{
          flex: 1,
          padding: "0 0.75rem",
          display: "flex",
          flexDirection: "column",
          gap: "2px",
        }}
      >
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.625rem",
              padding: "0.5rem 0.75rem",
              borderRadius: "5px",
              fontSize: "0.8125rem",
              fontFamily: "Inter, system-ui, sans-serif",
              color: "var(--text-secondary)",
              textDecoration: "none",
            }}
          >
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Bottom — org mark */}
      <div
        style={{
          padding: "1rem 1.25rem 0",
          borderTop: "1px solid var(--border-muted)",
          marginTop: "0.75rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
          <div
            style={{
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              background: "var(--accent)",
              flexShrink: 0,
            }}
          />
          <p
            style={{
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: "0.6875rem",
              color: "var(--text-muted)",
            }}
          >
            Thee Mystik Universal
          </p>
        </div>
        <p
          style={{
            fontFamily: "Georgia, serif",
            fontSize: "0.625rem",
            color: "var(--text-muted)",
            fontStyle: "italic",
            letterSpacing: "0.03em",
            paddingLeft: "0.875rem",
          }}
        >
          Holdings Corp.
        </p>
      </div>
    </aside>
  );
}
