"use client"

import { useState } from "react"
import type { NexisAIResponse } from "@/lib/nexis/schemas/ai-response"

// ── Types ────────────────────────────────────────────────────────────────────

type TaskType =
  | "general"
  | "architecture"
  | "workflow"
  | "research"
  | "grounding"
  | "code"
  | "proposal"
  | "knowledge_lookup"
  | "meeting_recap"
  | "content"

type Provider = "claude" | "openai" | "gemini" | "perplexity"
type OutputFormat = "markdown" | "json" | "text"

interface ConsoleForm {
  prompt: string
  taskType: TaskType
  preferredProvider: Provider | ""
  outputFormat: OutputFormat
  requiresCitations: boolean
  maxTokens: string
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AIConsolePage() {
  const [form, setForm] = useState<ConsoleForm>({
    prompt: "",
    taskType: "general",
    preferredProvider: "",
    outputFormat: "markdown" as OutputFormat,
    requiresCitations: false,
    maxTokens: "",
  })

  const [response, setResponse] = useState<NexisAIResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [rawError, setRawError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setResponse(null)
    setRawError(null)

    try {
      const body: Record<string, unknown> = {
        prompt: form.prompt,
        taskType: form.taskType,
        outputFormat: form.outputFormat,
        requiresCitations: form.requiresCitations,
      }

      if (form.preferredProvider) {
        body.preferredProvider = form.preferredProvider
      }

      if (form.maxTokens) {
        const parsed = parseInt(form.maxTokens, 10)
        if (!isNaN(parsed)) body.maxTokens = parsed
      }

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        setRawError(data.error ?? "Request failed")
        return
      }

      setResponse(data as NexisAIResponse)
    } catch (err) {
      setRawError(err instanceof Error ? err.message : "Unexpected error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.25rem" }}>
        NEXIS AI Console
      </h1>
      <p style={{ color: "#888", marginBottom: "2rem", fontSize: "0.875rem" }}>
        Internal OS-level interface — test prompts, inspect routing, and monitor provider behavior.
      </p>

      {/* ── Form ── */}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {/* Prompt */}
        <div>
          <label style={labelStyle}>Prompt</label>
          <textarea
            value={form.prompt}
            onChange={(e) => setForm({ ...form, prompt: e.target.value })}
            rows={5}
            required
            placeholder="Enter your prompt..."
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>

        {/* Row: Task Type + Preferred Provider */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <label style={labelStyle}>Task Type</label>
            <select
              value={form.taskType}
              onChange={(e) => setForm({ ...form, taskType: e.target.value as TaskType })}
              style={inputStyle}
            >
              {(
                [
                  "general", "architecture", "workflow", "research",
                  "grounding", "code", "proposal", "knowledge_lookup",
                  "meeting_recap", "content",
                ] as TaskType[]
              ).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Preferred Provider (optional)</label>
            <select
              value={form.preferredProvider}
              onChange={(e) => setForm({ ...form, preferredProvider: e.target.value as Provider | "" })}
              style={inputStyle}
            >
              <option value="">Auto (let router decide)</option>
              <option value="claude">Claude</option>
              <option value="openai">OpenAI</option>
              <option value="gemini">Gemini</option>
              <option value="perplexity">Perplexity</option>
            </select>
          </div>
        </div>

        {/* Row: Output Format + Max Tokens */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <label style={labelStyle}>Output Format</label>
            <select
              value={form.outputFormat}
              onChange={(e) => setForm({ ...form, outputFormat: e.target.value as OutputFormat })}
              style={inputStyle}
            >
              <option value="markdown">Markdown</option>
              <option value="json">JSON</option>
              <option value="text">Plain Text</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Max Tokens (optional)</label>
            <input
              type="number"
              value={form.maxTokens}
              onChange={(e) => setForm({ ...form, maxTokens: e.target.value })}
              placeholder="e.g. 2048"
              min={1}
              max={32000}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Citations toggle */}
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={form.requiresCitations}
            onChange={(e) => setForm({ ...form, requiresCitations: e.target.checked })}
          />
          <span style={{ fontSize: "0.875rem" }}>Require citations (routes to Perplexity)</span>
        </label>

        <button
          type="submit"
          disabled={loading || !form.prompt.trim()}
          style={buttonStyle(loading)}
        >
          {loading ? "Running…" : "Run Request"}
        </button>
      </form>

      {/* ── Error ── */}
      {rawError && (
        <div style={errorBoxStyle}>
          <strong>Error:</strong> {rawError}
        </div>
      )}

      {/* ── Response ── */}
      {response && (
        <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Metadata panel */}
          <div style={metaPanelStyle}>
            <h2 style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem", color: "#aaa" }}>
              Routing Metadata
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.75rem" }}>
              <MetaField label="Provider" value={response.provider} />
              <MetaField label="Model" value={response.model} />
              <MetaField label="Task Type" value={response.taskType} />
              <MetaField label="Status" value={response.success ? "success" : "error"} highlight={!response.success ? "red" : "green"} />
              <MetaField label="Latency" value={response.latencyMs != null ? `${response.latencyMs}ms` : "—"} />
              <MetaField label="Est. Cost" value={response.estimatedCost != null ? `$${response.estimatedCost.toFixed(6)}` : "—"} />
              <MetaField label="Fallback Provider" value={response.fallbackProvider ?? "none"} />
              <MetaField label="Branch" value={response.branch ?? "—"} />
            </div>
            <div style={{ marginTop: "0.75rem" }}>
              <span style={{ fontSize: "0.7rem", color: "#888", fontWeight: 600, textTransform: "uppercase" }}>Routing Reason</span>
              <p style={{ fontSize: "0.8rem", color: "#ccc", marginTop: "0.25rem", lineHeight: 1.5 }}>
                {response.routingReason}
              </p>
            </div>
          </div>

          {/* Output panel */}
          <div style={outputPanelStyle}>
            <h2 style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem", color: "#aaa" }}>
              Output
            </h2>
            <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: "0.875rem", lineHeight: 1.6, color: "#e5e5e5", margin: 0 }}>
              {response.output || "(empty response)"}
            </pre>
          </div>

          {/* Citations */}
          {response.citations && response.citations.length > 0 && (
            <div style={metaPanelStyle}>
              <h2 style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem", color: "#aaa" }}>
                Citations
              </h2>
              <ol style={{ paddingLeft: "1.25rem", margin: 0 }}>
                {response.citations.map((c, i) => (
                  <li key={i} style={{ fontSize: "0.8rem", color: "#ccc", marginBottom: "0.25rem" }}>
                    {c.title && <span>{c.title}: </span>}
                    {c.url ? (
                      <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ color: "#7c9ef8" }}>
                        {c.url}
                      </a>
                    ) : (
                      <span>—</span>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function MetaField({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: "red" | "green"
}) {
  return (
    <div>
      <span style={{ fontSize: "0.7rem", color: "#888", fontWeight: 600, textTransform: "uppercase", display: "block" }}>
        {label}
      </span>
      <span
        style={{
          fontSize: "0.85rem",
          color: highlight === "red" ? "#f87171" : highlight === "green" ? "#4ade80" : "#e5e5e5",
          fontWeight: 500,
        }}
      >
        {value}
      </span>
    </div>
  )
}

// ── Styles ───────────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.8rem",
  fontWeight: 600,
  color: "#aaa",
  marginBottom: "0.35rem",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.6rem 0.75rem",
  background: "#1a1a1a",
  border: "1px solid #333",
  borderRadius: "6px",
  color: "#e5e5e5",
  fontSize: "0.875rem",
  boxSizing: "border-box",
}

const buttonStyle = (loading: boolean): React.CSSProperties => ({
  padding: "0.75rem 1.5rem",
  background: loading ? "#333" : "#7c3aed",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  fontSize: "0.9rem",
  fontWeight: 600,
  cursor: loading ? "not-allowed" : "pointer",
  alignSelf: "flex-start",
})

const errorBoxStyle: React.CSSProperties = {
  marginTop: "1rem",
  padding: "0.75rem 1rem",
  background: "#2d0f0f",
  border: "1px solid #7f1d1d",
  borderRadius: "6px",
  color: "#fca5a5",
  fontSize: "0.875rem",
}

const metaPanelStyle: React.CSSProperties = {
  background: "#111",
  border: "1px solid #222",
  borderRadius: "8px",
  padding: "1rem 1.25rem",
}

const outputPanelStyle: React.CSSProperties = {
  background: "#0d0d0d",
  border: "1px solid #222",
  borderRadius: "8px",
  padding: "1rem 1.25rem",
}
