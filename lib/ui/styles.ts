/**
 * Thee Mystik Cove — Grant Engine
 * Shared UI style constants for all app pages.
 *
 * These map directly to the CSS variables defined in app/globals.css.
 * Import from here rather than hardcoding hex values or repeating
 * style objects across pages.
 */

import type { CSSProperties } from "react"

// ── Page shell ────────────────────────────────────────────────────────────────

export const pageShell: CSSProperties = {
  flex: 1,
  padding: "1.75rem",
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: "1.5rem",
}

// ── Cards / panels ────────────────────────────────────────────────────────────

/** Standard surface card with gold top-accent border */
export const card: CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderTop: "1px solid var(--border-accent)",
  borderRadius: "2px",
  padding: "1.125rem 1.375rem",
}

/** Recessed / secondary panel — no accent border */
export const panel: CSSProperties = {
  background: "var(--surface-raised)",
  border: "1px solid var(--border)",
  borderRadius: "2px",
  padding: "1rem 1.25rem",
}

/** Dark code / output surface */
export const outputPanel: CSSProperties = {
  background: "var(--surface-deep)",
  border: "1px solid var(--border)",
  borderRadius: "2px",
  padding: "1rem 1.25rem",
}

// ── Typography ────────────────────────────────────────────────────────────────

export const sectionTitle: CSSProperties = {
  fontFamily: "Georgia, 'Times New Roman', serif",
  fontSize: "0.875rem",
  fontWeight: 700,
  color: "var(--text-primary)",
  letterSpacing: "0.01em",
}

export const pageTitle: CSSProperties = {
  fontFamily: "Georgia, 'Times New Roman', serif",
  fontSize: "1.25rem",
  fontWeight: 700,
  color: "var(--text-primary)",
  letterSpacing: "0.01em",
}

/** Uppercase micro-label (used above fields and stats) */
export const microLabel: CSSProperties = {
  display: "block",
  fontSize: "0.5625rem",
  fontWeight: 600,
  color: "var(--text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.09em",
  fontFamily: "Inter, system-ui, sans-serif",
}

/** Slightly larger form field label */
export const fieldLabel: CSSProperties = {
  display: "block",
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "var(--text-muted)",
  marginBottom: "0.35rem",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontFamily: "Inter, system-ui, sans-serif",
}

export const bodyText: CSSProperties = {
  fontSize: "0.8125rem",
  color: "var(--text-secondary)",
  fontFamily: "Inter, system-ui, sans-serif",
  lineHeight: 1.6,
}

export const mutedText: CSSProperties = {
  fontSize: "0.75rem",
  color: "var(--text-muted)",
  fontFamily: "Inter, system-ui, sans-serif",
}

// ── Form controls ─────────────────────────────────────────────────────────────

/** Standard input / select / textarea — inherits global CSS reset */
export const inputField: CSSProperties = {
  width: "100%",
  padding: "0.6rem 0.75rem",
  background: "var(--surface-raised)",
  border: "1px solid var(--border)",
  borderRadius: "4px",
  color: "var(--text-primary)",
  fontSize: "0.875rem",
  fontFamily: "Inter, system-ui, sans-serif",
  boxSizing: "border-box",
}

// ── Buttons ───────────────────────────────────────────────────────────────────

export const primaryButton: CSSProperties = {
  padding: "0.625rem 1.375rem",
  background: "var(--accent)",
  color: "#efe8d6",
  border: "none",
  borderRadius: "4px",
  fontSize: "0.75rem",
  fontWeight: 700,
  cursor: "pointer",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  fontFamily: "Inter, system-ui, sans-serif",
  boxShadow: "0 2px 10px #bb7b3d30",
}

export const primaryButtonDisabled: CSSProperties = {
  ...primaryButton,
  background: "var(--surface-raised)",
  color: "var(--text-faint)",
  cursor: "not-allowed",
  boxShadow: "none",
}

export const ghostButton: CSSProperties = {
  padding: "0.625rem 1.125rem",
  background: "var(--surface)",
  color: "var(--text-secondary)",
  border: "1px solid var(--border)",
  borderRadius: "4px",
  fontSize: "0.75rem",
  fontWeight: 600,
  cursor: "pointer",
  letterSpacing: "0.04em",
  fontFamily: "Inter, system-ui, sans-serif",
}

// ── Status / semantic ─────────────────────────────────────────────────────────

/** Inline status chip. Pass a CSS variable string as `color`. */
export function statusChip(color: string): CSSProperties {
  return {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: "2px",
    fontSize: "0.5625rem",
    fontWeight: 700,
    background: `${color}18`,
    border: `1px solid ${color}40`,
    color,
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    whiteSpace: "nowrap",
    fontFamily: "Inter, system-ui, sans-serif",
    flexShrink: 0,
  }
}

export const errorBox: CSSProperties = {
  padding: "0.75rem 1rem",
  background: "var(--oxblood-muted)",
  border: "1px solid var(--danger)",
  borderRadius: "2px",
  color: "var(--text-primary)",
  fontSize: "0.8125rem",
  fontFamily: "Inter, system-ui, sans-serif",
}

// ── Dividers ──────────────────────────────────────────────────────────────────

export const rowDivider: CSSProperties = {
  borderBottom: "1px solid var(--border-muted)",
}
