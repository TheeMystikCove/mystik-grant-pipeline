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
        width: "232px",
        minHeight: "100vh",
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        position: "relative",
      }}
    >
      {/* Subtle vertical accent line on inner edge */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "1px",
          height: "100%",
          background:
            "linear-gradient(to bottom, transparent 0%, var(--border-accent) 20%, var(--border-accent) 80%, transparent 100%)",
          opacity: 0.3,
          pointerEvents: "none",
        }}
      />

      {/* Wordmark */}
      <div
        style={{
          padding: "1.5rem 1.375rem 1.25rem",
          borderBottom: "1px solid var(--border-muted)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {/* Diamond emblem */}
          <span
            style={{
              width: "32px",
              height: "32px",
              background: "var(--surface-deep)",
              border: "1px solid var(--accent)",
              borderRadius: "2px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "11px",
              color: "var(--accent)",
              flexShrink: 0,
              transform: "rotate(45deg)",
              boxShadow: "0 0 10px var(--accent-glow)",
            }}
          >
            <span style={{ transform: "rotate(-45deg)", display: "block" }}>✦</span>
          </span>
          <div>
            <p
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: "0.875rem",
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
                fontSize: "0.5rem",
                color: "var(--text-muted)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginTop: "2px",
              }}
            >
              Mystik Holdings
            </p>
          </div>
        </div>
      </div>

      {/* Section label */}
      <div
        style={{
          padding: "1.25rem 1.375rem 0.5rem",
        }}
      >
        <span
          style={{
            fontSize: "0.5rem",
            color: "var(--text-faint)",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          Navigation
        </span>
      </div>

      {/* Nav */}
      <nav
        style={{
          flex: 1,
          padding: "0 0.75rem",
          display: "flex",
          flexDirection: "column",
          gap: "1px",
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
              padding: "0.5625rem 0.75rem",
              borderRadius: "2px",
              fontSize: "0.8125rem",
              fontFamily: "Inter, system-ui, sans-serif",
              color: "var(--text-secondary)",
              textDecoration: "none",
              letterSpacing: "0.01em",
              transition: "background 0.1s, color 0.1s",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                color: "var(--accent)",
                opacity: 0.7,
                flexShrink: 0,
                width: "14px",
                textAlign: "center",
              }}
            >
              {item.icon}
            </span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Ornamental divider */}
      <div
        style={{
          margin: "0 1.375rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.75rem 0",
        }}
      >
        <div style={{ flex: 1, height: "1px", background: "var(--border-muted)" }} />
        <span
          style={{
            fontSize: "0.375rem",
            color: "var(--ornament)",
            letterSpacing: "0.2em",
          }}
        >
          ◆
        </span>
        <div style={{ flex: 1, height: "1px", background: "var(--border-muted)" }} />
      </div>

      {/* Org footer */}
      <div style={{ padding: "0.5rem 1.375rem 1.375rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4375rem",
            marginBottom: "0.1875rem",
          }}
        >
          <div
            style={{
              width: "4px",
              height: "4px",
              background: "var(--accent)",
              borderRadius: "50%",
              flexShrink: 0,
              opacity: 0.7,
            }}
          />
          <p
            style={{
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: "0.625rem",
              color: "var(--text-muted)",
              letterSpacing: "0.03em",
            }}
          >
            Thee Mystik Universal
          </p>
        </div>
        <p
          style={{
            fontFamily: "Georgia, serif",
            fontSize: "0.5625rem",
            color: "var(--text-faint)",
            fontStyle: "italic",
            letterSpacing: "0.04em",
            paddingLeft: "0.8125rem",
          }}
        >
          Holdings Corp.
        </p>
      </div>
    </aside>
  );
}
