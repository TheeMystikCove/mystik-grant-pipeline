import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { formatCurrency, daysUntil } from "@/lib/utils";

interface DeadlineOpp {
  id: string;
  name: string;
  funder_name: string;
  deadline: string;
  award_max: number | null;
  status: string;
}

async function getDeadlines(): Promise<DeadlineOpp[]> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("opportunities")
    .select("id, name, funder_name, deadline, award_max, status")
    .not("status", "in", '("declined","awarded","archived")')
    .not("deadline", "is", null)
    .order("deadline", { ascending: true });
  return (data ?? []) as DeadlineOpp[];
}

function googleCalendarUrl(opp: DeadlineOpp): string {
  const d = new Date(opp.deadline);
  // All-day event: end date is exclusive (day after)
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (date: Date) =>
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`;
  const start = fmt(d);
  const end = fmt(new Date(d.getTime() + 86400000));
  const title = encodeURIComponent(`DEADLINE: ${opp.name}`);
  const details = encodeURIComponent(
    `Funder: ${opp.funder_name}${opp.award_max ? `\nAward: ${formatCurrency(opp.award_max)}` : ""}\nStatus: ${opp.status}\n\nManaged via Grant Engine — Thee Mystik Universal Holdings Corp.`
  );
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}%2F${end}&details=${details}`;
}

function urgencyProps(days: number | null): { color: string; dot: string; label: string } {
  if (days === null) return { color: "var(--text-muted)", dot: "var(--border)", label: "No date" };
  if (days < 0) return { color: "var(--danger)", dot: "var(--danger)", label: `${Math.abs(days)}d overdue` };
  if (days === 0) return { color: "var(--danger)", dot: "var(--danger)", label: "Due today" };
  if (days <= 7) return { color: "var(--warning)", dot: "var(--warning)", label: `${days}d left` };
  if (days <= 30) return { color: "var(--info)", dot: "var(--info)", label: `${days}d left` };
  return { color: "var(--text-muted)", dot: "var(--border)", label: `${days}d left` };
}

function formatMonthGroup(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

function formatDeadlineDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

export default async function CalendarPage() {
  const deadlines = await getDeadlines();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const dueThisWeek = deadlines.filter((o) => {
    const d = daysUntil(o.deadline);
    return d !== null && d >= 0 && d <= 7;
  }).length;

  const dueThisMonth = deadlines.filter((o) => {
    const d = daysUntil(o.deadline);
    return d !== null && d >= 0 && d <= 30;
  }).length;

  const overdue = deadlines.filter((o) => {
    const d = daysUntil(o.deadline);
    return d !== null && d < 0;
  }).length;

  // Group by month
  const groups = new Map<string, DeadlineOpp[]>();
  for (const opp of deadlines) {
    const key = formatMonthGroup(opp.deadline);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(opp);
  }

  return (
    <>
      <Topbar
        title="Deadline Calendar"
        subtitle="All upcoming grant deadlines"
        action={
          deadlines.length > 0 ? (
            <a
              href="/api/calendar/export.ics"
              download="grant-deadlines.ics"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                padding: "0.4375rem 0.875rem",
                background: "var(--surface)",
                border: "1px solid var(--border-accent)",
                borderRadius: "6px",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "var(--accent)",
                textDecoration: "none",
                letterSpacing: "0.03em",
              }}
            >
              ⬇ Export .ics
            </a>
          ) : undefined
        }
      />

      <main style={{ flex: 1, overflowY: "auto", padding: "1.75rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
          {[
            { label: "Total Upcoming", value: deadlines.length, color: "var(--text-secondary)" },
            { label: "Overdue", value: overdue, color: overdue > 0 ? "var(--danger)" : "var(--text-muted)" },
            { label: "Due This Week", value: dueThisWeek, color: dueThisWeek > 0 ? "var(--warning)" : "var(--text-muted)" },
            { label: "Due This Month", value: dueThisMonth, color: "var(--info)" },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderTop: "1px solid var(--border-accent)",
                borderRadius: "2px",
                padding: "1rem 1.25rem",
              }}
            >
              <p style={{ fontSize: "0.5625rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: "0.4rem", fontFamily: "Inter, system-ui, sans-serif" }}>
                {s.label}
              </p>
              <p style={{ fontFamily: "Georgia, serif", fontSize: "1.625rem", fontWeight: 700, color: s.color, lineHeight: 1 }}>
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {deadlines.length === 0 ? (
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "3rem",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: "0.9375rem", color: "var(--text-secondary)", marginBottom: "0.625rem" }}>No upcoming deadlines</p>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>
              Add grant opportunities with deadlines to track them here.
            </p>
            <Link
              href="/opportunities/find"
              style={{
                display: "inline-block",
                padding: "0.5625rem 1.25rem",
                background: "var(--accent)",
                color: "#efe8d6",
                borderRadius: "6px",
                textDecoration: "none",
                fontSize: "0.8125rem",
                fontWeight: 700,
                letterSpacing: "0.04em",
              }}
            >
              Find Grants →
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {Array.from(groups.entries()).map(([month, opps]) => (
              <div key={month}>
                {/* Month header */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.625rem" }}>
                  <p style={{ fontSize: "0.625rem", fontWeight: 700, color: "var(--accent)", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "Inter, system-ui, sans-serif", whiteSpace: "nowrap" }}>
                    {month}
                  </p>
                  <div style={{ flex: 1, height: "1px", background: "var(--border-muted)" }} />
                  <p style={{ fontSize: "0.5625rem", color: "var(--text-faint)", fontFamily: "Inter, system-ui, sans-serif", whiteSpace: "nowrap" }}>
                    {opps.length} {opps.length === 1 ? "deadline" : "deadlines"}
                  </p>
                </div>

                {/* Rows */}
                <div
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                    overflow: "hidden",
                  }}
                >
                  {opps.map((opp, i) => {
                    const days = daysUntil(opp.deadline);
                    const { color, dot, label } = urgencyProps(days);
                    return (
                      <div
                        key={opp.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "8px 1fr auto",
                          alignItems: "center",
                          gap: "1rem",
                          padding: "0.875rem 1.25rem",
                          borderBottom: i < opps.length - 1 ? "1px solid var(--border-muted)" : "none",
                          background: days !== null && days < 0 ? "rgba(var(--danger-rgb, 180,60,60), 0.04)" : "transparent",
                        }}
                      >
                        {/* Urgency dot */}
                        <span
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background: dot,
                            flexShrink: 0,
                          }}
                        />

                        {/* Opportunity info */}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                            <Link
                              href={`/opportunities/${opp.id}`}
                              style={{
                                fontSize: "0.875rem",
                                fontWeight: 600,
                                color: "var(--text-primary)",
                                textDecoration: "none",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                fontFamily: "Inter, system-ui, sans-serif",
                              }}
                            >
                              {opp.name}
                            </Link>
                            <span
                              style={{
                                fontSize: "0.5625rem",
                                fontWeight: 700,
                                color,
                                textTransform: "uppercase",
                                letterSpacing: "0.06em",
                                fontFamily: "Inter, system-ui, sans-serif",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {label}
                            </span>
                          </div>
                          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px", fontFamily: "Inter, system-ui, sans-serif" }}>
                            {opp.funder_name}
                            {opp.award_max ? (
                              <>
                                {" "}<span style={{ color: "var(--text-faint)" }}>·</span>{" "}
                                <span style={{ color: "var(--accent)", opacity: 0.85 }}>{formatCurrency(opp.award_max)}</span>
                              </>
                            ) : null}
                          </p>
                        </div>

                        {/* Date + Actions */}
                        <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", flexShrink: 0 }}>
                          <p style={{ fontSize: "0.8125rem", fontWeight: 600, color, fontFamily: "Inter, system-ui, sans-serif", textAlign: "right", whiteSpace: "nowrap" }}>
                            {formatDeadlineDate(opp.deadline)}
                          </p>
                          <a
                            href={googleCalendarUrl(opp)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Add to Google Calendar"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "28px",
                              height: "28px",
                              background: "var(--surface-accent)",
                              border: "1px solid var(--border)",
                              borderRadius: "6px",
                              textDecoration: "none",
                              fontSize: "0.75rem",
                              flexShrink: 0,
                            }}
                          >
                            📅
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Google Calendar note */}
        {deadlines.length > 0 && (
          <p style={{ fontSize: "0.6875rem", color: "var(--text-faint)", textAlign: "center", fontFamily: "Inter, system-ui, sans-serif", lineHeight: 1.5 }}>
            📅 Click any calendar icon to add that deadline to Google Calendar · Use <strong style={{ color: "var(--text-muted)" }}>Export .ics</strong> to import all deadlines at once into Google Calendar, Apple Calendar, or Outlook
          </p>
        )}
      </main>
    </>
  );
}
