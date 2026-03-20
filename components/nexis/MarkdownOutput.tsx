"use client"

/**
 * MarkdownOutput
 *
 * Renders NEXIS agent and AI gateway responses as formatted markdown.
 * Uses remark-gfm for full GFM support: tables, strikethrough, task lists.
 * Styled to match the Mystik brand aesthetic.
 */

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { Components } from "react-markdown"
import type { CSSProperties } from "react"

interface Props {
  content: string
  /** Optional label shown above the output (e.g. "Output", "Response") */
  label?: string
  /** Wrap in a surface panel. Default: true */
  withPanel?: boolean
}

export function MarkdownOutput({ content, label, withPanel = true }: Props) {
  const inner = (
    <div>
      {label && (
        <p style={labelStyle}>{label}</p>
      )}
      <div style={proseStyle}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={COMPONENTS}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  )

  if (!withPanel) return inner

  return (
    <div style={panelStyle}>
      {inner}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const panelStyle: CSSProperties = {
  background: "var(--surface-deep)",
  border: "1px solid var(--border)",
  borderTop: "2px solid var(--border-accent)",
  borderRadius: "2px",
  padding: "1.375rem 1.5rem",
}

const labelStyle: CSSProperties = {
  fontSize: "0.5625rem",
  fontWeight: 700,
  color: "var(--text-faint)",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  fontFamily: "Inter, system-ui, sans-serif",
  marginBottom: "0.875rem",
}

const proseStyle: CSSProperties = {
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: "0.875rem",
  lineHeight: 1.75,
  color: "var(--text-secondary)",
}

// ── Component overrides ───────────────────────────────────────────────────────

const COMPONENTS: Components = {
  // ── Headings ────────────────────────────────────────────────────────────────
  h1: ({ children }) => (
    <h1 style={{
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: "1.125rem",
      fontWeight: 700,
      color: "var(--text-primary)",
      letterSpacing: "0.01em",
      marginTop: "1.75rem",
      marginBottom: "0.5rem",
      lineHeight: 1.25,
      paddingBottom: "0.5rem",
      borderBottom: "1px solid var(--border-accent)",
    }}>
      {children}
    </h1>
  ),

  h2: ({ children }) => (
    <h2 style={{
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: "1rem",
      fontWeight: 700,
      color: "var(--text-primary)",
      letterSpacing: "0.01em",
      marginTop: "1.5rem",
      marginBottom: "0.375rem",
      lineHeight: 1.3,
    }}>
      {children}
    </h2>
  ),

  h3: ({ children }) => (
    <h3 style={{
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: "0.9375rem",
      fontWeight: 700,
      color: "var(--accent)",
      letterSpacing: "0.01em",
      marginTop: "1.25rem",
      marginBottom: "0.25rem",
      lineHeight: 1.3,
    }}>
      {children}
    </h3>
  ),

  h4: ({ children }) => (
    <h4 style={{
      fontFamily: "Inter, system-ui, sans-serif",
      fontSize: "0.6875rem",
      fontWeight: 700,
      color: "var(--text-muted)",
      textTransform: "uppercase",
      letterSpacing: "0.1em",
      marginTop: "1.125rem",
      marginBottom: "0.25rem",
    }}>
      {children}
    </h4>
  ),

  h5: ({ children }) => (
    <h5 style={{
      fontFamily: "Inter, system-ui, sans-serif",
      fontSize: "0.75rem",
      fontWeight: 600,
      color: "var(--text-muted)",
      marginTop: "1rem",
      marginBottom: "0.2rem",
    }}>
      {children}
    </h5>
  ),

  // ── Paragraphs ───────────────────────────────────────────────────────────────
  p: ({ children }) => (
    <p style={{
      margin: "0.5rem 0",
      color: "var(--text-secondary)",
      lineHeight: 1.75,
    }}>
      {children}
    </p>
  ),

  // ── Lists ────────────────────────────────────────────────────────────────────
  ul: ({ children }) => (
    <ul style={{
      margin: "0.5rem 0",
      paddingLeft: "1.25rem",
      display: "flex",
      flexDirection: "column",
      gap: "0.2rem",
      listStyleType: "disc",
    }}>
      {children}
    </ul>
  ),

  ol: ({ children }) => (
    <ol style={{
      margin: "0.5rem 0",
      paddingLeft: "1.25rem",
      display: "flex",
      flexDirection: "column",
      gap: "0.2rem",
      listStyleType: "decimal",
    }}>
      {children}
    </ol>
  ),

  li: ({ children }) => (
    <li style={{
      color: "var(--text-secondary)",
      lineHeight: 1.65,
      paddingLeft: "0.2rem",
    }}>
      {children}
    </li>
  ),

  // ── Emphasis ─────────────────────────────────────────────────────────────────
  strong: ({ children }) => (
    <strong style={{ color: "var(--text-primary)", fontWeight: 700 }}>
      {children}
    </strong>
  ),

  em: ({ children }) => (
    <em style={{ color: "var(--accent)", fontStyle: "italic" }}>
      {children}
    </em>
  ),

  del: ({ children }) => (
    <del style={{ color: "var(--text-faint)", textDecoration: "line-through" }}>
      {children}
    </del>
  ),

  // ── Code ─────────────────────────────────────────────────────────────────────
  code: ({ children, className }) => {
    const isBlock = Boolean(className?.startsWith("language-"))
    if (isBlock) {
      return (
        <code style={{
          display: "block",
          background: "var(--surface-raised)",
          border: "1px solid var(--border)",
          borderLeft: "2px solid var(--border-accent)",
          borderRadius: "0 2px 2px 0",
          padding: "0.875rem 1rem",
          fontSize: "0.8125rem",
          fontFamily: "'Fira Code', 'Cascadia Code', 'Courier New', monospace",
          color: "var(--text-primary)",
          overflowX: "auto",
          lineHeight: 1.6,
          whiteSpace: "pre",
        }}>
          {children}
        </code>
      )
    }
    return (
      <code style={{
        background: "var(--surface-accent)",
        border: "1px solid var(--border)",
        borderRadius: "2px",
        padding: "1px 5px",
        fontSize: "0.8125em",
        fontFamily: "'Fira Code', 'Cascadia Code', 'Courier New', monospace",
        color: "var(--accent)",
      }}>
        {children}
      </code>
    )
  },

  pre: ({ children }) => (
    <pre style={{
      background: "var(--surface-raised)",
      border: "1px solid var(--border)",
      borderLeft: "2px solid var(--border-accent)",
      borderRadius: "0 2px 2px 0",
      padding: "0.875rem 1rem",
      overflowX: "auto",
      margin: "0.625rem 0",
      lineHeight: 1.6,
    }}>
      {children}
    </pre>
  ),

  // ── Blockquotes ───────────────────────────────────────────────────────────────
  blockquote: ({ children }) => (
    <blockquote style={{
      borderLeft: "2px solid var(--accent)",
      margin: "0.875rem 0",
      padding: "0.625rem 1rem",
      background: "var(--surface-accent)",
      borderRadius: "0 2px 2px 0",
      color: "var(--text-muted)",
      fontFamily: "Georgia, serif",
      fontStyle: "italic",
    }}>
      {children}
    </blockquote>
  ),

  // ── Dividers ──────────────────────────────────────────────────────────────────
  hr: () => (
    <div style={{
      borderTop: "1px solid var(--border-accent)",
      margin: "1.375rem 0",
      opacity: 0.4,
    }} />
  ),

  // ── Tables (requires remark-gfm) ──────────────────────────────────────────────
  table: ({ children }) => (
    <div style={{
      overflowX: "auto",
      margin: "1rem 0",
      border: "1px solid var(--border)",
      borderRadius: "2px",
    }}>
      <table style={{
        width: "100%",
        borderCollapse: "collapse",
        fontSize: "0.8125rem",
        fontFamily: "Inter, system-ui, sans-serif",
      }}>
        {children}
      </table>
    </div>
  ),

  thead: ({ children }) => (
    <thead style={{
      background: "var(--surface-raised)",
      borderBottom: "1px solid var(--border-accent)",
    }}>
      {children}
    </thead>
  ),

  tbody: ({ children }) => (
    <tbody>{children}</tbody>
  ),

  tr: ({ children }) => (
    <tr style={{ borderBottom: "1px solid var(--border-muted)" }}>
      {children}
    </tr>
  ),

  th: ({ children }) => (
    <th style={{
      padding: "0.5rem 0.875rem",
      textAlign: "left",
      fontWeight: 700,
      fontSize: "0.5625rem",
      color: "var(--text-muted)",
      textTransform: "uppercase",
      letterSpacing: "0.1em",
      whiteSpace: "nowrap",
    }}>
      {children}
    </th>
  ),

  td: ({ children }) => (
    <td style={{
      padding: "0.5625rem 0.875rem",
      color: "var(--text-secondary)",
      verticalAlign: "top",
      lineHeight: 1.5,
    }}>
      {children}
    </td>
  ),

  // ── Links ─────────────────────────────────────────────────────────────────────
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        color: "var(--accent)",
        textDecoration: "underline",
        textUnderlineOffset: "3px",
        textDecorationColor: "var(--border-accent)",
      }}
    >
      {children}
    </a>
  ),
}
