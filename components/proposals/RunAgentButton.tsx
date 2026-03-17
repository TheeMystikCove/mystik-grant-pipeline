"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  proposalProjectId: string;
  agentName: string;        // first unrun agent determined by server
  pipelineSequence: string[]; // full ordered pipeline so we can advance locally
}

const STAGE_LABELS: Record<string, string> = {
  intake_orchestrator: "Intake Orchestrator",
  grant_requirements_parser: "Requirements Parser",
  funder_fit_analyzer: "Funder Fit Analyzer",
  research_evidence_scout: "Research Scout",
  program_architect: "Program Architect",
  narrative_strategist: "Narrative Strategist",
  budget_architect: "Budget Architect",
  evaluation_designer: "Evaluation Designer",
  compliance_qa_reviewer: "Compliance QA",
  proposal_compiler: "Proposal Compiler",
  revision_manager: "Revision Manager",
  final_grant_writer: "Final Grant Writer",
};

export function RunAgentButton({ proposalProjectId, agentName, pipelineSequence }: Props) {
  const router = useRouter();

  // activeAgent tracks which agent the button will run next.
  // Initialized from server prop; advances locally on completion.
  const [activeAgent, setActiveAgent] = useState(agentName);
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const label = STAGE_LABELS[activeAgent] ?? activeAgent.replace(/_/g, " ");
  const currentIdx = pipelineSequence.indexOf(activeAgent);
  const isLast = currentIdx === pipelineSequence.length - 1 || currentIdx === -1;
  const nextAgent = !isLast ? pipelineSequence[currentIdx + 1] : null;
  const nextLabel = nextAgent
    ? (STAGE_LABELS[nextAgent] ?? nextAgent.replace(/_/g, " "))
    : null;

  async function handleRun() {
    setStatus("running");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalProjectId, agentName: activeAgent, input: {} }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(body.error ?? "Agent run failed");
      }

      // Advance to the next agent locally — no need to wait for server refresh
      if (nextAgent) {
        setActiveAgent(nextAgent);
        setStatus("idle");
      } else {
        setStatus("done"); // pipeline complete
      }

      // Refresh server component data to update sidebar dots and sections
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }

  if (status === "running") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.625rem",
          padding: "0.875rem 1rem",
          background: "var(--surface-accent)",
          border: "1px solid var(--border-accent)",
          borderRadius: "6px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          <Spinner />
          <span
            style={{
              fontSize: "0.8125rem",
              fontWeight: 600,
              color: "var(--accent)",
              fontFamily: "Georgia, serif",
            }}
          >
            Running {label}…
          </span>
        </div>
        <p style={{ fontSize: "0.6875rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
          The agent is drafting — this may take 30–90 seconds. Do not close the tab.
        </p>
        <div
          style={{
            height: "2px",
            background: "var(--border)",
            borderRadius: "1px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              background: "var(--accent)",
              borderRadius: "1px",
              animation: "progress-pulse 2s ease-in-out infinite",
              width: "60%",
            }}
          />
        </div>
        <style>{`
          @keyframes progress-pulse {
            0%   { transform: translateX(-100%); }
            100% { transform: translateX(250%); }
          }
        `}</style>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <div
          style={{
            background: "var(--oxblood-muted)",
            border: "1px solid var(--oxblood)",
            borderRadius: "6px",
            padding: "0.625rem 0.875rem",
            fontSize: "0.75rem",
            color: "#e8b4b2",
            lineHeight: 1.5,
          }}
        >
          <strong>Agent failed:</strong> {errorMsg}
        </div>
        <button onClick={handleRun} style={btnStyle}>
          Retry {label}
        </button>
      </div>
    );
  }

  if (status === "done") {
    return (
      <button onClick={handleRun} style={{ ...btnStyle, background: "var(--success)" }}>
        ✓ Pipeline Complete — Run Again
      </button>
    );
  }

  // idle — show the next agent to run, with a hint about what follows
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
      <button onClick={handleRun} style={btnStyle}>
        ▶ Run {label}
      </button>
      {nextLabel && (
        <p style={{ fontSize: "0.6875rem", color: "var(--text-muted)", textAlign: "center", margin: 0 }}>
          Next: {nextLabel}
        </p>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <>
      <div
        style={{
          width: "14px",
          height: "14px",
          border: "2px solid var(--border-accent)",
          borderTopColor: "var(--accent)",
          borderRadius: "50%",
          animation: "spin 0.7s linear infinite",
          flexShrink: 0,
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

const btnStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--accent)",
  color: "#efe8d6",
  border: "none",
  borderRadius: "6px",
  padding: "0.5625rem",
  fontSize: "0.8125rem",
  fontWeight: 700,
  letterSpacing: "0.04em",
  cursor: "pointer",
  textTransform: "uppercase",
};
