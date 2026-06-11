/**
 * NEXIS Surface Gate — grant-engine
 *
 * Runtime permission enforcement for the NEXIS AI.OS access model.
 * The grant-engine does not currently have a formal role column in its users
 * table. Until one is added, authenticated users are defaulted to
 * STAFF_SPECIALIST — appropriate because the engine is a staff-facing tool.
 *
 * When a `role` column is added to the users table, update resolveGrantTier()
 * to map role values using the grant-engine local role definitions:
 *   grt-grant-director   → EXECUTIVE_CORE
 *   grt-grant-coordinator → ADMIN_OPERATIONS
 *   grt-reviewer          → STAFF_SPECIALIST
 *   grt-document-support  → STAFF_SPECIALIST
 *   grt-applicant         → MEMBER
 *   grt-member            → MEMBER
 *
 * Governance reference: NEXIS_AI_CORE/identity/permissions/master-permission-map.md
 * Local role definitions: grant-engine/.nexis/access/local-roles.json
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type NexisTier =
  | "EXECUTIVE_CORE"
  | "ADMIN_OPERATIONS"
  | "STAFF_SPECIALIST"
  | "MEMBER";

export type NexisSurface =
  | "member_frontend"
  | "companion_guidance"
  | "application_dashboard"
  | "document_upload_flow"
  | "status_tracker"
  | "local_support_tools"
  | "local_admin_tools"
  | "template_manager"
  | "local_incidents"
  | "backend_ops";

export type AccessDecision = {
  decision: "allow" | "allow_limited" | "deny";
  tier: NexisTier;
  surface: NexisSurface;
  reason: string;
};

// ── Internal maps ─────────────────────────────────────────────────────────────

/** Trust level: 1 = highest (EXECUTIVE_CORE), 4 = lowest (MEMBER). */
const TIER_LEVEL: Record<NexisTier, number> = {
  EXECUTIVE_CORE: 1,
  ADMIN_OPERATIONS: 2,
  STAFF_SPECIALIST: 3,
  MEMBER: 4,
};

/**
 * Minimum tier level required per surface.
 * User's level must be ≤ this value to access the surface.
 */
const SURFACE_MIN_TIER_LEVEL: Record<NexisSurface, number> = {
  member_frontend: 4,       // All tiers
  companion_guidance: 4,    // All tiers — Nexis companion is member-safe
  application_dashboard: 4, // All tiers — applicant-facing
  document_upload_flow: 4,  // All tiers — applicant-facing
  status_tracker: 4,        // All tiers — applicant-facing
  local_support_tools: 3,   // STAFF_SPECIALIST and above
  local_admin_tools: 2,     // ADMIN_OPERATIONS and above
  template_manager: 2,      // ADMIN_OPERATIONS and above
  local_incidents: 2,       // ADMIN_OPERATIONS and above
  backend_ops: 2,           // ADMIN_OPERATIONS (limited) / EXECUTIVE_CORE (full)
};

/** Surfaces where only EXECUTIVE_CORE gets full access; ADMIN gets allow_limited. */
const EXECUTIVE_FULL_ONLY: Set<NexisSurface> = new Set(["backend_ops"]);

// ── Role → Tier mapping (grant-engine) ───────────────────────────────────────

/**
 * Maps a grant-engine user role to its NEXIS global tier.
 *
 * NOTE: The grant-engine does not yet have a role column. This function
 * accepts an optional role value and defaults to STAFF_SPECIALIST when
 * no role is present. Add role column to users table and pass it here
 * to enable full tier-based enforcement.
 */
export function resolveGrantTier(role: string | null | undefined): NexisTier {
  switch (role) {
    // Future role values — uncomment when role column is added:
    // case "grant_director":   return "EXECUTIVE_CORE";
    // case "grant_coordinator": return "ADMIN_OPERATIONS";
    // case "reviewer":
    // case "document_support": return "STAFF_SPECIALIST";
    // case "applicant":
    // case "member":           return "MEMBER";
    default:
      // No role system yet. Default authenticated users to ADMIN_OPERATIONS so
      // current single-org staff retain full function (run-pipeline, os/canon,
      // admin tools) — matching pre-gate behaviour where every authenticated
      // user is trusted staff. Phase 1 multi-tenant adds a role column; at that
      // point tighten this default to MEMBER and map real roles above.
      return "ADMIN_OPERATIONS";
  }
}

// ── Pathname → Surface mapping (grant-engine) ─────────────────────────────────

/**
 * Resolves the NEXIS surface ID from a request pathname for grant-engine.
 * Route pattern → surface:
 *   /api/nexis/*              → companion_guidance
 *   /api/agents/run-pipeline  → backend_ops  (full pipeline execution)
 *   /api/os/*                 → local_admin_tools
 *   /api/debug/*              → local_admin_tools
 *   /api/projects/*           → local_support_tools
 *   /api/proposals/*          → local_support_tools
 *   /api/opportunities/*      → application_dashboard
 *   (default)                 → member_frontend
 */
export function resolveGrantSurface(pathname: string): NexisSurface {
  if (pathname.startsWith("/api/nexis"))               return "companion_guidance";
  if (pathname.startsWith("/api/agents/run-pipeline")) return "backend_ops";
  if (pathname.startsWith("/api/agents"))              return "local_support_tools";
  if (pathname.startsWith("/api/notion"))              return "local_admin_tools";
  if (pathname.startsWith("/api/os"))                  return "local_admin_tools";
  if (pathname.startsWith("/api/projects"))            return "local_support_tools";
  if (pathname.startsWith("/api/proposals"))           return "local_support_tools";
  if (pathname.startsWith("/api/opportunities"))       return "application_dashboard";
  return "member_frontend";
}

// ── Access resolution ─────────────────────────────────────────────────────────

/**
 * Resolves an access decision for a given tier × surface combination.
 *
 * Outcomes:
 *   allow         — full access granted
 *   allow_limited — access granted with restricted actions
 *   deny          — access denied; tier is below the surface minimum
 */
export function resolveAccess(
  tier: NexisTier,
  surface: NexisSurface
): AccessDecision {
  const userLevel = TIER_LEVEL[tier];
  const required = SURFACE_MIN_TIER_LEVEL[surface];

  if (userLevel > required) {
    const minTierName = (Object.entries(TIER_LEVEL) as [NexisTier, number][]).find(
      ([, v]) => v === required
    )?.[0] ?? "elevated tier";

    return {
      decision: "deny",
      tier,
      surface,
      reason: `Surface '${surface}' requires ${minTierName} or above. Current tier: ${tier}.`,
    };
  }

  if (EXECUTIVE_FULL_ONLY.has(surface) && userLevel > 1) {
    return {
      decision: "allow_limited",
      tier,
      surface,
      reason: `${tier} has limited access to '${surface}'. Some actions are restricted to EXECUTIVE_CORE.`,
    };
  }

  return { decision: "allow", tier, surface, reason: "Access granted." };
}

/**
 * Returns true if the surface requires a DB profile lookup in middleware.
 * Surfaces at MEMBER tier (level 4) skip the DB call — auth alone is sufficient.
 */
export function surfaceRequiresProfileCheck(surface: NexisSurface): boolean {
  return SURFACE_MIN_TIER_LEVEL[surface] < 4;
}
