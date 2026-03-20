"use client";

import { useState, useRef } from "react";
import { createProjectFromDocument } from "./actions";

export function NewProjectClient() {
  const [mode, setMode] = useState<"upload" | "manual">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    if (file) fd.set("document", file);
    const result = await createProjectFromDocument(fd);
    if (result?.error) {
      setError(result.error);
      setSubmitting(false);
    }
    // on success, server action redirects — no need to do anything
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && ACCEPTED.some((ext) => dropped.name.toLowerCase().endsWith(ext))) {
      setFile(dropped);
    }
  }

  return (
    <div style={{ maxWidth: "680px" }}>
      {/* Mode tabs */}
      <div style={{ display: "flex", gap: "0", marginBottom: "1.5rem", background: "var(--surface-raised)", borderRadius: "6px", padding: "3px", width: "fit-content" }}>
        {(["upload", "manual"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            style={{
              padding: "0.4rem 1rem",
              borderRadius: "4px",
              border: "none",
              background: mode === m ? "var(--surface)" : "transparent",
              color: mode === m ? "var(--text-primary)" : "var(--text-muted)",
              fontSize: "0.8125rem",
              fontWeight: mode === m ? 600 : 400,
              cursor: "pointer",
              boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,0.2)" : "none",
            }}
          >
            {m === "upload" ? "Upload Document" : "Manual Entry"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {mode === "upload" ? (
          <>
            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragging ? "var(--accent)" : file ? "var(--success)" : "var(--border)"}`,
                borderRadius: "8px",
                padding: "2.5rem",
                textAlign: "center",
                cursor: "pointer",
                background: dragging ? "var(--surface-raised)" : "var(--surface)",
                transition: "border-color 0.15s",
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.md"
                style={{ display: "none" }}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {file ? (
                <>
                  <p style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>📄</p>
                  <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>{file.name}</p>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                    {(file.size / 1024).toFixed(0)} KB · click to change
                  </p>
                </>
              ) : (
                <>
                  <p style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⬆</p>
                  <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
                    Drop your project document here
                  </p>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    PDF, Word (.docx), Markdown, or plain text · max 10MB
                  </p>
                </>
              )}
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
              NEXIS will extract your project details, generate keyword tags, and prepare the Initiative Architect conversation. You can edit everything after upload.
            </p>
          </>
        ) : (
          <>
            <Field label="Project Title *">
              <input name="title" required style={inputStyle} placeholder="e.g. Trauma-Informed Youth Wellness Initiative" />
            </Field>
            <Field label="Description">
              <textarea name="description" rows={3} style={{ ...inputStyle, resize: "vertical" }} placeholder="What does this project do and why?" />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <Field label="Program Area">
                <input name="program_area" style={inputStyle} placeholder="e.g. Mental Health" />
              </Field>
              <Field label="Target Population">
                <input name="target_population" style={inputStyle} placeholder="e.g. Youth ages 14–24" />
              </Field>
            </div>
            <Field label="Keyword Tags (comma-separated)">
              <input name="tags" style={inputStyle} placeholder="trauma-informed, youth, mental health, community wellness" />
            </Field>
          </>
        )}

        {error && (
          <p style={{ fontSize: "0.8125rem", color: "var(--danger)", background: "var(--oxblood-muted)", padding: "0.75rem 1rem", borderRadius: "6px", border: "1px solid var(--danger)" }}>
            {error}
          </p>
        )}

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <a
            href="/projects"
            style={{ padding: "0.5625rem 1.25rem", fontSize: "0.8125rem", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: "5px", textDecoration: "none", fontWeight: 500 }}
          >
            Cancel
          </a>
          <button
            type="submit"
            disabled={submitting || (mode === "upload" && !file)}
            style={{
              padding: "0.5625rem 1.5rem",
              fontSize: "0.8125rem",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              background: submitting ? "var(--accent-muted)" : "var(--accent)",
              color: "#efe8d6",
              border: "none",
              borderRadius: "5px",
              cursor: submitting ? "not-allowed" : "pointer",
              opacity: mode === "upload" && !file ? 0.5 : 1,
            }}
          >
            {submitting ? "Processing…" : "Create Project"}
          </button>
        </div>
      </form>
    </div>
  );
}

const ACCEPTED = [".pdf", ".docx", ".txt", ".md"];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
      <label style={{ fontSize: "0.6875rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "var(--surface-raised)",
  border: "1px solid var(--border)",
  borderRadius: "5px",
  padding: "0.5625rem 0.75rem",
  fontSize: "0.875rem",
  color: "var(--text-primary)",
  width: "100%",
};
