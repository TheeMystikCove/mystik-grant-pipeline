"use client"

/**
 * MarkdownOutput
 *
 * Renders NEXIS agent and AI gateway responses as formatted markdown.
 * Styled to match the Mystik brand aesthetic — warm ochre accents,
 * Georgia serif headings, parchment text, dark surfaces.
 */

import ReactMarkdown from "react-markdown"
import type { Components } from "react-markdown"
import type { CSSProperties } from "react"

interface Props {
  content: string
  /** Wrap in a surface panel. Default: true */
  withPanel?: boolean
}

export function MarkdownOutput({ content, withPanel = true }: Props) {
  const inner = (
    <div style={proseStyle}>
      <ReactMarkdown components={COMPONENTS}>
        {content}
      </ReactMarkdown>
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
  borderTop: "1px solid var(--border-accent)",
  borderRadius: "2px",
  padding: "1.25rem 1.5rem",
}

const proseStyle: CSSProperties = {
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: "0.875rem",
  lineHeight: 1.75,
  color: "var(--text-secondary)",
}

// ── Component overrides ───────────────────────────────────────────────────────

const COMPONENTS: Components = {
  // Headings
  h1: ({ children }) => (
    <h1 style={{
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: "1.125rem",
      fontWeight: 700,
      color: "var(--text-primary)",
      letterSpacing: "0.01em",
      marginTop: "1.5rem",
      marginBottom: "0.625rem",
      lineHeight: 1.3,
      borderBottom: "1px solid var(--border-accent)",
      paddingBottom: "0.375rem",
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
      marginTop: "1.375rem",
      marginBottom: "0.5rem",
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
      marginBottom: "0.375rem",
      lineHeight: 1.3,
    }}>
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 style={{
      fontFamily: "Inter, system-ui, sans-serif",
      fontSize: "0.75rem",
      fontWeight: 700,
      color: "var(--text-muted)",
      textTransform: "uppercase",
      letterSpacing: "0.09em",
      marginTop: "1rem",
      marginBottom: "0.25rem",
    }}>
      {children}
    </h4>
  ),

  // Paragraphs
  p: ({ children }) => (
    <p style={{
      marginTop: "0.625rem",
      marginBottom: "0.625rem",
      color: "var(--text-secondary)",
      lineHeight: 1.75,
    }}>
      {children}
    </p>
  ),

  // Lists
  ul: ({ children }) => (
    <ul style={{
      marginTop: "0.5rem",
      marginBottom: "0.625rem",
      paddingLeft: "1.375rem",
      display: "flex",
      flexDirection: "column",
      gap: "0.25rem",
    }}>
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol style={{
      marginTop: "0.5rem",
      marginBottom: "0.625rem",
      paddingLeft: "1.375rem",
      display: "flex",
      flexDirection: "column",
      gap: "0.25rem",
    }}>
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li style={{
      color: "var(--text-secondary)",
      lineHeight: 1.65,
      paddingLeft: "0.25rem",
    }}>
      {children}
    </li>
  ),

  // Emphasis
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

  // Inline code
  code: ({ children, className }) => {
    const isBlock = className?.startsWith("language-")
    if (isBlock) {
      return (
        <code style={{
          display: "block",
          background: "var(--surface-raised)",
          border: "1px solid var(--border)",
          borderRadius: "2px",
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
        fontSize: "0.8125rem",
        fontFamily: "'Fira Code', 'Cascadia Code', 'Courier New', monospace",
        color: "var(--accent)",
      }}>
        {children}
      </code>
    )
  },

  // Code blocks
  pre: ({ children }) => (
    <pre style={{
      background: "var(--surface-raised)",
      border: "1px solid var(--border)",
      borderLeft: "2px solid var(--border-accent)",
      borderRadius: "2px",
      padding: "0.875rem 1rem",
      overflowX: "auto",
      marginTop: "0.625rem",
      marginBottom: "0.625rem",
      lineHeight: 1.6,
    }}>
      {children}
    </pre>
  ),

  // Blockquotes
  blockquote: ({ children }) => (
    <blockquote style={{
      borderLeft: "2px solid var(--accent)",
      paddingLeft: "1rem",
      marginLeft: 0,
      marginTop: "0.75rem",
      marginBottom: "0.75rem",
      color: "var(--text-muted)",
      fontFamily: "Georgia, serif",
      fontStyle: "italic",
      background: "var(--surface-accent)",
      padding: "0.625rem 1rem",
      borderRadius: "0 2px 2px 0",
    }}>
      {children}
    </blockquote>
  ),

  // Horizontal rule
  hr: () => (
    <hr style={{
      border: "none",
      borderTop: "1px solid var(--border-accent)",
      margin: "1.25rem 0",
      opacity: 0.5,
    }} />
  ),

  // Tables
  table: ({ children }) => (
    <div style={{ overflowX: "auto", marginTop: "0.75rem", marginBottom: "0.75rem" }}>
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
    <thead style={{ background: "var(--surface-raised)" }}>
      {children}
    </thead>
  ),
  th: ({ children }) => (
    <th style={{
      padding: "0.5rem 0.75rem",
      textAlign: "left",
      fontWeight: 700,
      fontSize: "0.625rem",
      color: "var(--text-muted)",
      textTransform: "uppercase",
      letterSpacing: "0.09em",
      borderBottom: "1px solid var(--border-accent)",
      whiteSpace: "nowrap",
    }}>
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td style={{
      padding: "0.5rem 0.75rem",
      borderBottom: "1px solid var(--border-muted)",
      color: "var(--text-secondary)",
      verticalAlign: "top",
      lineHeight: 1.5,
    }}>
      {children}
    </td>
  ),

  // Links
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        color: "var(--accent)",
        textDecoration: "underline",
        textUnderlineOffset: "2px",
        textDecorationColor: "var(--border-accent)",
      }}
    >
      {children}
    </a>
  ),
}
