"use client"

import { useState } from "react"
import { Topbar } from "@/components/layout/topbar"
import { NEXIS_AGENT_DEFINITIONS, type NexisAgentDefinition } from "@/lib/nexis/agents/agent-definitions"
import { pageShell, card, fieldLabel, inputField, primaryButton, primaryButtonDisabled, microLabel, statusChip, errorBox } from "@/lib/ui/styles"
import { MarkdownOutput } from "@/components/nexis/MarkdownOutput"
import type { AgentRunResult } from "@/lib/nexis/agents/agent-runner"

// ── Domain color map ──────────────────────────────────────────────────────────

const DOMAIN_COLOR: Record<string, string> = {
  CORE:    "var(--accent)",
  ACADEMY: "var(--info)",
  STUDIOS: "var(--success)",
  HARBOR:  "var(--warning)",
  MARKET:  "var(--text-secondary)",
  OPS:     "var(--text-muted)",
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AgentsPage() {
  const [selected, setSelected] = useState<NexisAgentDefinition | null>(null)
  const [prompt, setPrompt] = useState("")
  const [context, setContext] = useState("")
  const [result, setResult] = useState<AgentRunResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRun(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!selected || !prompt.trim()) return
    setLoading(true)
    setResult(null)
    setError(null)

    try {
      const res = await fetch("/api/nexis/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: selected.id, prompt, context: context || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Request failed"); return }
      setResult(data as AgentRunResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error")
    } finally {
      setLoading(false)
    }
  }

  function selectAgent(agent: NexisAgentDefinition) {
    setSelected(agent)
    setPrompt("")
    setContext("")
    setResult(null)
    setError(null)
  }

  // Group by domain
  const byDomain = NEXIS_AGENT_DEFINITIONS.reduce<Record<string, NexisAgentDefinition[]>>((acc, a) => {
    (acc[a.domain] ??= []).push(a)
    return acc
  }, {})

  return (
    <>
      <Topbar title="Agent Registry" subtitle="NEXIS OS — Invoke Named Agents" />

      <main style={{ ...pageShell, flexDirection: "row", gap: "1.5rem", alignItems: "flex-start" }}>

        {/* ── Left: Agent roster ── */}
        <div style={{ width: "280px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {Object.entries(byDomain).map(([domain, agents]) => (
            <div key={domain}>
              <p style={{ ...microLabel, marginBottom: "0.5rem", paddingLeft: "0.25rem" }}>
                {domain}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                {agents.map((agent) => {
                  const isActive = selected?.id === agent.id
                  const color = DOMAIN_COLOR[agent.domain] ?? "var(--text-muted)"
                  return (
                    <button
                      key={agent.id}
                      onClick={() => selectAgent(agent)}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        gap: "2px",
                        padding: "0.625rem 0.875rem",
                        background: isActive ? "var(--surface-accent)" : "var(--surface)",
                        border: `1px solid ${isActive ? "var(--border-accent)" : "var(--border)"}`,
                        borderLeft: `2px solid ${isActive ? color : "transparent"}`,
                        borderRadius: "2px",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.1s",
                        width: "100%",
                      }}
                    >
                      <span style={{
                        fontSize: "0.8125rem",
                        fontWeight: 600,
                        color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                        fontFamily: "Georgia, serif",
                        lineHeight: 1.2,
                      }}>
                        {agent.displayName}
                      </span>
                      <span style={{
                        fontSize: "0.625rem",
                        color: "var(--text-faint)",
                        fontFamily: "Inter, system-ui, sans-serif",
                        letterSpacing: "0.04em",
                        lineHeight: 1.4,
                      }}>
                        {agent.taskType.replace(/_/g, " ")}
                        {agent.requiresCitations && " · cites sources"}
                        {agent.sensitivity === "high" && " · high sensitivity"}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* ── Right: Runner ── */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "1rem" }}>
          {!selected ? (
            <div style={{ ...card, padding: "3rem 2rem", textAlign: "center" }}>
              <p style={{ fontFamily: "Georgia, serif", fontSize: "1rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                Select an agent to invoke
              </p>
              <p style={{ fontSize: "0.75rem", color: "var(--text-faint)", marginTop: "0.5rem", fontFamily: "Inter, system-ui, sans-serif" }}>
                {NEXIS_AGENT_DEFINITIONS.length} agents registered across {Object.keys(byDomain).length} domains
              </p>
            </div>
          ) : (
            <>
              {/* Agent header */}
              <div style={card}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
                  <div>
                    <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.0625rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.2 }}>
                      {selected.displayName}
                    </h2>
                    <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "0.375rem", lineHeight: 1.6, fontFamily: "Inter, system-ui, sans-serif" }}>
                      {selected.description}
                    </p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", flexShrink: 0, alignItems: "flex-end" }}>
                    <span style={statusChip(DOMAIN_COLOR[selected.domain] ?? "var(--text-muted)")}>
                      {selected.domain}
                    </span>
                    {selected.requiresCitations && (
                      <span style={statusChip("var(--info)")}>cites sources</span>
                    )}
                    {selected.sensitivity === "high" && (
                      <span style={statusChip("var(--warning)")}>high sensitivity</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Run form */}
              <form onSubmit={handleRun} style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                <div style={card}>
                  <label style={fieldLabel}>Prompt</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={4}
                    required
                    placeholder={`What would you like ${selected.displayName} to do?`}
                    style={{ ...inputField, resize: "vertical" }}
                  />
                </div>

                <div style={card}>
                  <label style={fieldLabel}>Additional Context (optional)</label>
                  <textarea
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    rows={3}
                    placeholder="Paste relevant background, documents, or data…"
                    style={{ ...inputField, resize: "vertical" }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !prompt.trim()}
                  style={loading || !prompt.trim() ? primaryButtonDisabled : primaryButton}
                >
                  {loading ? `Running ${selected.displayName}…` : `◎ Invoke ${selected.displayName}`}
                </button>
              </form>

              {/* Error */}
              {error && <div style={errorBox}><strong>Error:</strong> {error}</div>}

              {/* Result */}
              {result && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                  {/* Metadata */}
                  <div style={card}>
                    <p style={{ ...microLabel, marginBottom: "0.75rem" }}>Execution Metadata</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.875rem" }}>
                      {[
                        { label: "Status",   value: result.success ? "success" : "error", color: result.success ? "var(--success)" : "var(--danger)" },
                        { label: "Provider", value: result.provider },
                        { label: "Model",    value: result.model },
                        { label: "Latency",  value: result.latencyMs ? `${result.latencyMs}ms` : "—" },
                      ].map(({ label, value, color }) => (
                        <div key={label}>
                          <span style={microLabel}>{label}</span>
                          {color ? (
                            <span style={{ ...statusChip(color), marginTop: "0.3rem", display: "inline-block" }}>{value}</span>
                          ) : (
                            <span style={{ display: "block", fontSize: "0.875rem", color: "var(--text-primary)", fontWeight: 500, marginTop: "0.2rem", fontFamily: "Inter, system-ui, sans-serif" }}>{value}</span>
                          )}
                        </div>
                      ))}
                    </div>
                    {result.routingReason && (
                      <div style={{ marginTop: "0.75rem", borderTop: "1px solid var(--border-muted)", paddingTop: "0.625rem" }}>
                        <span style={microLabel}>Routing Reason</span>
                        <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "0.25rem", lineHeight: 1.6, fontFamily: "Inter, system-ui, sans-serif" }}>
                          {result.routingReason}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Output */}
                  <MarkdownOutput label="Output" content={result.output || "(empty response)"} />
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </>
  )
}
