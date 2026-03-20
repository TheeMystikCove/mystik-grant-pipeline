"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function SectionMarkdown({ content }: { content: string }) {
  return (
    <div className="section-markdown" style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.75 }}>
      <style>{`
        .section-markdown p { margin: 0 0 0.75em; }
        .section-markdown p:last-child { margin-bottom: 0; }
        .section-markdown h1,.section-markdown h2,.section-markdown h3 {
          font-family: Georgia, 'Times New Roman', serif;
          font-weight: 700;
          color: var(--text-primary);
          margin: 1em 0 0.4em;
        }
        .section-markdown h1 { font-size: 1rem; }
        .section-markdown h2 { font-size: 0.9375rem; }
        .section-markdown h3 { font-size: 0.875rem; }
        .section-markdown ul,.section-markdown ol {
          margin: 0.5em 0 0.75em 1.25em;
          padding: 0;
        }
        .section-markdown li { margin-bottom: 0.25em; }
        .section-markdown strong { font-weight: 700; color: var(--text-primary); }
        .section-markdown em { font-style: italic; }
        .section-markdown table {
          border-collapse: collapse;
          width: 100%;
          margin: 0.75em 0;
          font-size: 0.8125rem;
        }
        .section-markdown th,.section-markdown td {
          border: 1px solid var(--border);
          padding: 0.375rem 0.625rem;
          text-align: left;
        }
        .section-markdown th {
          background: var(--surface-raised);
          font-weight: 600;
          color: var(--text-primary);
        }
        .section-markdown hr { border: none; border-top: 1px solid var(--border-muted); margin: 1em 0; }
        .section-markdown code {
          font-family: monospace;
          font-size: 0.75rem;
          background: var(--surface-raised);
          padding: 0.1em 0.3em;
          border-radius: 2px;
        }
      `}</style>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
