"use client";

import { useState, useEffect, useRef } from "react";
import { signOut } from "@/app/(auth)/login/actions";

interface Props {
  fullName: string | null;
  email: string;
}

export function SidebarUserMenu({ fullName, email }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const displayName = fullName?.trim() || email.split("@")[0];

  const initials = fullName
    ? fullName
        .trim()
        .split(/\s+/)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .slice(0, 2)
        .join("")
    : email.slice(0, 2).toUpperCase();

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "0.625rem",
          padding: "0.625rem 1.375rem",
          background: open ? "var(--surface-accent)" : "transparent",
          border: "none",
          borderTop: "1px solid var(--border-muted)",
          cursor: "pointer",
          textAlign: "left",
          transition: "background 0.1s",
        }}
      >
        {/* Initials circle */}
        <div
          style={{
            width: "30px",
            height: "30px",
            borderRadius: "50%",
            background: "var(--surface-deep)",
            border: `1px solid ${open ? "var(--accent)" : "var(--border-accent)"}`,
            color: "var(--accent)",
            fontSize: "0.5625rem",
            fontWeight: 700,
            letterSpacing: "0.06em",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "border-color 0.15s",
          }}
        >
          {initials}
        </div>

        {/* Name */}
        <div style={{ minWidth: 0, flex: 1 }}>
          <p
            style={{
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "var(--text-secondary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              lineHeight: 1.3,
            }}
          >
            {displayName}
          </p>
          <p
            style={{
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: "0.5625rem",
              color: "var(--text-muted)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              letterSpacing: "0.03em",
              marginTop: "1px",
            }}
          >
            {email}
          </p>
        </div>

        {/* Chevron */}
        <span
          style={{
            fontSize: "0.5rem",
            color: "var(--text-muted)",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.15s",
            flexShrink: 0,
          }}
        >
          ▲
        </span>
      </button>

      {/* Dropdown — opens upward */}
      {open && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 4px)",
            left: "0.75rem",
            right: "0.75rem",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            boxShadow: "0 -4px 20px rgba(0,0,0,0.35)",
            zIndex: 200,
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "0.375rem 0" }}>
            <a
              href="/account"
              onClick={() => setOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.625rem",
                padding: "0.5625rem 1rem",
                fontSize: "0.8125rem",
                color: "var(--text-secondary)",
                textDecoration: "none",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-accent)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ fontSize: "0.75rem", color: "var(--accent)", opacity: 0.7 }}>⚙</span>
              Account Settings
            </a>

            <div style={{ height: "1px", background: "var(--border-muted)", margin: "0.25rem 0" }} />

            <form action={signOut}>
              <button
                type="submit"
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.625rem",
                  padding: "0.5625rem 1rem",
                  fontSize: "0.8125rem",
                  color: "var(--danger)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-accent)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ fontSize: "0.75rem" }}>→</span>
                Sign Out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
