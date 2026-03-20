"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { usePathname } from "next/navigation";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const WELCOME: Message = {
  role: "assistant",
  content:
    "Nexis online. What are you working through today — a specific grant, the pipeline, or something broader about strategy?",
};

export function NexisPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pathname = usePathname();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  // Focus textarea when opening
  useEffect(() => {
    if (open) setTimeout(() => textareaRef.current?.focus(), 100);
  }, [open]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);

    // Add empty assistant message that we'll stream into
    const assistantIdx = newMessages.length;
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/nexis/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, pageContext: pathname }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Failed to reach Nexis");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        const snapshot = accumulated;
        startTransition(() => {
          setMessages((prev) => {
            const updated = [...prev];
            updated[assistantIdx] = { role: "assistant", content: snapshot };
            return updated;
          });
        });
      }
    } catch (err) {
      const errorText =
        err instanceof Error ? err.message : "Something went wrong.";
      setMessages((prev) => {
        const updated = [...prev];
        updated[assistantIdx] = {
          role: "assistant",
          content: `◆ ${errorText}`,
        };
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle Nexis"
        style={{
          position: "fixed",
          bottom: "1.5rem",
          right: "1.5rem",
          zIndex: 900,
          width: "48px",
          height: "48px",
          background: open ? "var(--surface-deep)" : "var(--accent)",
          border: `1px solid ${open ? "var(--border-accent)" : "var(--accent)"}`,
          borderRadius: "2px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: open
            ? "none"
            : "0 0 20px #bb7b3d40, 0 4px 12px #00000040",
          transform: "rotate(45deg)",
          transition: "all 0.2s",
        }}
      >
        <span
          style={{
            display: "block",
            transform: "rotate(-45deg)",
            fontSize: "18px",
            color: open ? "var(--accent)" : "#efe8d6",
            lineHeight: 1,
          }}
        >
          {open ? "✕" : "✦"}
        </span>
      </button>

      {/* Panel */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: "5.5rem",
            right: "1.5rem",
            zIndex: 899,
            width: "380px",
            maxHeight: "560px",
            display: "flex",
            flexDirection: "column",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderTop: "2px solid var(--accent)",
            borderRadius: "2px",
            boxShadow: "0 16px 48px #00000060, 0 0 0 1px #bb7b3d12",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "0.875rem 1.125rem",
              borderBottom: "1px solid var(--border-muted)",
              background: "var(--surface-raised)",
              display: "flex",
              alignItems: "center",
              gap: "0.625rem",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "22px",
                height: "22px",
                background: "var(--surface-deep)",
                border: "1px solid var(--accent)",
                borderRadius: "2px",
                fontSize: "9px",
                color: "var(--accent)",
                transform: "rotate(45deg)",
                flexShrink: 0,
              }}
            >
              <span style={{ transform: "rotate(-45deg)", display: "block" }}>
                ✦
              </span>
            </span>
            <div>
              <p
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: "0.8125rem",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  lineHeight: 1,
                }}
              >
                Nexis
              </p>
              <p
                style={{
                  fontSize: "0.5625rem",
                  color: "var(--text-muted)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginTop: "2px",
                }}
              >
                Strategic Intelligence
              </p>
            </div>
            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: "0.625rem",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: streaming ? "var(--warning)" : "var(--success)",
                  flexShrink: 0,
                  transition: "background 0.3s",
                }}
              />
              <span
                style={{
                  fontSize: "0.5625rem",
                  color: "var(--text-faint)",
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                }}
              >
                {streaming ? "thinking" : "ready"}
              </span>
              <button
                onClick={() => setMessages([WELCOME])}
                disabled={streaming}
                title="Clear conversation"
                style={{
                  background: "none",
                  border: "none",
                  cursor: streaming ? "not-allowed" : "pointer",
                  padding: "2px 4px",
                  fontSize: "0.5625rem",
                  color: "var(--text-faint)",
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  fontFamily: "Inter, system-ui, sans-serif",
                  opacity: streaming ? 0.4 : 1,
                  transition: "color 0.15s",
                }}
              >
                Clear
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.875rem",
            }}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                {msg.role === "assistant" && (
                  <span
                    style={{
                      fontSize: "0.5rem",
                      color: "var(--accent)",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      marginBottom: "0.25rem",
                      fontWeight: 700,
                    }}
                  >
                    Nexis
                  </span>
                )}
                <div
                  style={{
                    maxWidth: "88%",
                    padding: "0.5625rem 0.75rem",
                    background:
                      msg.role === "user"
                        ? "var(--accent)"
                        : "var(--surface-raised)",
                    border:
                      msg.role === "user"
                        ? "none"
                        : "1px solid var(--border-muted)",
                    borderRadius: "2px",
                    fontSize: "0.8125rem",
                    color:
                      msg.role === "user" ? "#efe8d6" : "var(--text-secondary)",
                    lineHeight: 1.65,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {msg.content}
                  {/* Streaming cursor */}
                  {streaming &&
                    i === messages.length - 1 &&
                    msg.role === "assistant" && (
                      <span
                        style={{
                          display: "inline-block",
                          width: "2px",
                          height: "0.875em",
                          background: "var(--accent)",
                          marginLeft: "2px",
                          verticalAlign: "middle",
                          animation: "nexis-blink 1s step-end infinite",
                        }}
                      />
                    )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div
            style={{
              padding: "0.75rem",
              borderTop: "1px solid var(--border-muted)",
              background: "var(--surface-raised)",
              flexShrink: 0,
              display: "flex",
              gap: "0.5rem",
              alignItems: "flex-end",
            }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Ask Nexis…"
              disabled={streaming}
              style={{
                flex: 1,
                background: "var(--surface-deep)",
                border: "1px solid var(--border)",
                borderRadius: "2px",
                padding: "0.5rem 0.625rem",
                fontSize: "0.8125rem",
                color: "var(--text-primary)",
                resize: "none",
                outline: "none",
                fontFamily: "Inter, system-ui, sans-serif",
                lineHeight: 1.5,
                maxHeight: "120px",
                overflowY: "auto",
                opacity: streaming ? 0.6 : 1,
              }}
            />
            <button
              onClick={sendMessage}
              disabled={streaming || !input.trim()}
              style={{
                background:
                  streaming || !input.trim()
                    ? "var(--surface-accent)"
                    : "var(--accent)",
                border: "none",
                borderRadius: "2px",
                padding: "0.5rem 0.75rem",
                fontSize: "0.6875rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                color:
                  streaming || !input.trim()
                    ? "var(--text-faint)"
                    : "#efe8d6",
                cursor:
                  streaming || !input.trim() ? "not-allowed" : "pointer",
                flexShrink: 0,
                transition: "all 0.15s",
                textTransform: "uppercase",
              }}
            >
              {streaming ? "…" : "Send"}
            </button>
          </div>
        </div>
      )}

      {/* Blink animation */}
      <style>{`
        @keyframes nexis-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </>
  );
}
