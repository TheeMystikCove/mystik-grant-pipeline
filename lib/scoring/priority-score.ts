/**
 * Grant Match Prioritizer — weighted scoring model.
 *
 * Weights from the spec:
 *   Strategic Fit          40%
 *   Eligibility Confidence 25%
 *   Internal Readiness     15%
 *   Award Value vs Effort  10%
 *   Deadline Urgency       10%
 */

export interface ScoreInputs {
  strategic_fit: number;        // 1–10
  eligibility_confidence: number; // 1–10
  internal_readiness: number;   // 1–10
  value_vs_effort: number;      // 1–10
  deadline_urgency: number;     // 1–10
}

export interface ScoreResult {
  strategic_fit_score: number;
  eligibility_score: number;
  readiness_score: number;
  award_value_score: number;
  urgency_score: number;
  total_score: number; // 0–100
  label: string;
}

const WEIGHTS = {
  strategic_fit: 0.40,
  eligibility_confidence: 0.25,
  internal_readiness: 0.15,
  value_vs_effort: 0.10,
  deadline_urgency: 0.10,
} as const;

export function calculatePriorityScore(inputs: ScoreInputs): ScoreResult {
  const clamp = (v: number) => Math.max(1, Math.min(10, v));

  const sf = clamp(inputs.strategic_fit);
  const ec = clamp(inputs.eligibility_confidence);
  const ir = clamp(inputs.internal_readiness);
  const ve = clamp(inputs.value_vs_effort);
  const du = clamp(inputs.deadline_urgency);

  const sfW = sf * WEIGHTS.strategic_fit * 10;
  const ecW = ec * WEIGHTS.eligibility_confidence * 10;
  const irW = ir * WEIGHTS.internal_readiness * 10;
  const veW = ve * WEIGHTS.value_vs_effort * 10;
  const duW = du * WEIGHTS.deadline_urgency * 10;

  const total = round(sfW + ecW + irW + veW + duW);
  return {
    strategic_fit_score: round(sfW),
    eligibility_score: round(ecW),
    readiness_score: round(irW),
    award_value_score: round(veW),
    urgency_score: round(duW),
    total_score: total,
    label: scoreLabel(total),
  };
}

export function scoreLabel(score: number): "Strong" | "Moderate" | "Weak" {
  if (score >= 70) return "Strong";
  if (score >= 45) return "Moderate";
  return "Weak";
}

function round(n: number) {
  return Math.round(n * 10) / 10;
}
