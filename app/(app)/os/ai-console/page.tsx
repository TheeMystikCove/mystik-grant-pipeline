"use client"

import { useState } from "react"
import { Topbar } from "@/components/layout/topbar"
import { MarkdownOutput } from "@/components/nexis/MarkdownOutput"
import {
  pageShell,
  card,
  fieldLabel,
  inputField,
  primaryButton,
  primaryButtonDisabled,
  errorBox,
  microLabel,
  statusChip,
} from "@/lib/ui/styles"
import type { NexisAIResponse } from "@/lib/nexis/schemas/ai-response"

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AIConsolePage() {
  const [form, setForm] = useState<ConsoleForm>({
    prompt: "",
    taskType: "general",
    preferredProvider: "",
    outputFormat: "markdown",
    requiresCitations: false,
    maxTokens: "",
  })

  const [response, setResponse] = useState<NexisAIResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [rawError, setRawError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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
      if (form.preferredProvider) body.preferredProvider = form.preferredProvider
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
      if (!res.ok) { setRawError(data.error ?? "Request failed"); return }
      setResponse(data as NexisAIResponse)
    } catch (err) {
      setRawError(err instanceof Error ? err.message : "Unexpected error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Topbar title="AI Console" subtitle="NEXIS OS — Provider Gateway" />

      <main style={pageShell}>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "860px" }}>

          {/* Prompt */}
          <div style={card}>
            <label style={fieldLabel}>Prompt</label>
            <textarea
              value={form.prompt}
              onChange={(e) => setForm({ ...form, prompt: e.target.value })}
              rows={5}
              required
              placeholder="Enter your prompt…"
              style={{ ...inputField, resize: "vertical" }}
            />
          </div>

          {/* Controls row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>

            <div style={card}>
              <label style={fieldLabel}>Task Type</label>
              <select
                value={form.taskType}
                onChange={(e) => setForm({ ...form, taskType: e.target.value as TaskType })}
                style={inputField}
              >
                {(["general","architecture","workflow","research","grounding","code","proposal","knowledge_lookup","meeting_recap","content"] as TaskType[]).map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>

            <div style={card}>
              <label style={fieldLabel}>Preferred Provider</label>
              <select
                value={form.preferredProvider}
                onChange={(e) => setForm({ ...form, preferredProvider: e.target.value as Provider | "" })}
                style={inputField}
              >
                <option value="">Auto — let router decide</option>
                <option value="claude">Claude</option>
                <option value="openai">OpenAI</option>
                <option value="gemini">Gemini</option>
                <option value="perplexity">Perplexity</option>
              </select>
            </div>

            <div style={card}>
              <label style={fieldLabel}>Output Format</label>
              <select
                value={form.outputFormat}
                onChange={(e) => setForm({ ...form, outputFormat: e.target.value as OutputFormat })}
                style={inputField}
              >
                <option value="markdown">Markdown</option>
                <option value="json">JSON</option>
                <option value="text">Plain Text</option>
              </select>
            </div>

            <div style={card}>
              <label style={fieldLabel}>Max Tokens (optional)</label>
              <input
                type="number"
                value={form.maxTokens}
                onChange={(e) => setForm({ ...form, maxTokens: e.target.value })}
                placeholder="e.g. 2048"
                min={1}
                max={32000}
                style={inputField}
              />
            </div>

          </div>

          {/* Citations + submit */}
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={form.requiresCitations}
                onChange={(e) => setForm({ ...form, requiresCitations: e.target.checked })}
                style={{ width: "14px", height: "14px", accentColor: "var(--accent)" }}
              />
              <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", fontFamily: "Inter, system-ui, sans-serif" }}>
                Require citations — routes to Perplexity
              </span>
            </label>

            <button
              type="submit"
              disabled={loading || !form.prompt.trim()}
              style={loading || !form.prompt.trim() ? primaryButtonDisabled : primaryButton}
            >
              {loading ? "Running…" : "◎ Run Request"}
            </button>
          </div>
        </form>

        {/* ── Error ── */}
        {rawError && (
          <div style={{ ...errorBox, maxWidth: "860px" }}>
            <strong>Error:</strong> {rawError}
          </div>
        )}

        {/* ── Response ── */}
        {response && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "860px" }}>

            {/* Routing metadata */}
            <div style={card}>
              <p style={{ ...microLabel, marginBottom: "0.875rem" }}>Routing Metadata</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem" }}>
                <MetaField label="Provider"         value={response.provider} />
                <MetaField label="Model"            value={response.model} />
                <MetaField label="Task Type"        value={response.taskType} />
                <MetaField label="Status"           value={response.success ? "success" : "error"} color={response.success ? "var(--success)" : "var(--danger)"} />
                <MetaField label="Latency"          value={response.latencyMs != null ? `${response.latencyMs}ms` : "—"} />
                <MetaField label="Est. Cost"        value={response.estimatedCost != null ? `$${response.estimatedCost.toFixed(6)}` : "—"} />
                <MetaField label="Fallback"         value={response.fallbackProvider ?? "none"} />
                <MetaField label="Branch"           value={response.branch ?? "—"} />
              </div>
              {response.routingReason && (
                <div style={{ marginTop: "0.875rem", borderTop: "1px solid var(--border-muted)", paddingTop: "0.75rem" }}>
                  <span style={microLabel}>Routing Reason</span>
                  <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "0.35rem", lineHeight: 1.6, fontFamily: "Inter, system-ui, sans-serif" }}>
                    {response.routingReason}
                  </p>
                </div>
              )}
            </div>

            {/* Output */}
            <MarkdownOutput label="Output" content={response.output || "(empty response)"} />

            {/* Citations */}
            {response.citations && response.citations.length > 0 && (
              <div style={card}>
                <p style={{ ...microLabel, marginBottom: "0.75rem" }}>Citations</p>
                <ol style={{ paddingLeft: "1.25rem", margin: 0, display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                  {response.citations.map((c, i) => (
                    <li key={i} style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", fontFamily: "Inter, system-ui, sans-serif" }}>
                      {c.title && <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{c.title}: </span>}
                      {c.url ? (
                        <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>
                          {c.url}
                        </a>
                      ) : (
                        <span style={{ color: "var(--text-faint)" }}>—</span>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            )}

          </div>
        )}
      </main>
    </>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MetaField({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <span style={microLabel}>{label}</span>
      {color ? (
        <span style={{ ...statusChip(color), marginTop: "0.375rem" }}>{value}</span>
      ) : (
        <span style={{ fontSize: "0.875rem", color: "var(--text-primary)", fontWeight: 500, fontFamily: "Inter, system-ui, sans-serif", marginTop: "0.2rem", display: "block" }}>
          {value}
        </span>
      )}
    </div>
  )
}
