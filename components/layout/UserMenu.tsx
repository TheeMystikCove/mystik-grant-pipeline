"use client";

import { useState, useEffect, useRef } from "react";
import { signOut } from "@/app/(auth)/login/actions";
import { createClient } from "@/lib/supabase/client";

export function UserMenu() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

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

  const initials = email
    ? email.split("@")[0].slice(0, 2).toUpperCase()
    : "—";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Avatar button */}
      <button
        onClick={() => setOpen((v) => !v)}
        title="Account"
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "50%",
          background: open ? "var(--accent)" : "var(--surface-deep)",
          border: "1px solid var(--border-accent)",
          color: open ? "#efe8d6" : "var(--accent)",
          fontSize: "0.625rem",
          fontWeight: 700,
          letterSpacing: "0.06em",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.15s, color 0.15s",
          flexShrink: 0,
        }}
      >
        {initials}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            minWidth: "220px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            zIndex: 200,
            overflow: "hidden",
          }}
        >
          {/* User info header */}
          <div
            style={{
              padding: "0.875rem 1rem",
              borderBottom: "1px solid var(--border-muted)",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "var(--surface-deep)",
                border: "1px solid var(--accent)",
                color: "var(--accent)",
                fontSize: "0.75rem",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "0.625rem",
                letterSpacing: "0.06em",
              }}
            >
              {initials}
            </div>
            <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "2px" }}>
              {email?.split("@")[0] ?? "Account"}
            </p>
            <p style={{ fontSize: "0.6875rem", color: "var(--text-muted)", wordBreak: "break-all" }}>
              {email ?? "Loading…"}
            </p>
          </div>

          {/* Menu items */}
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
                cursor: "pointer",
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
