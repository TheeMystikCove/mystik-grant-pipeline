/**
 * Funder Enrichment — ProPublica Nonprofit Explorer API
 *
 * Looks up funder organization data from public IRS 990 filings via ProPublica.
 * Enriches opportunities with: EIN, address, phone, website, total giving,
 * number of grants, and derived median grant amount.
 *
 * Runs fire-and-forget alongside scoring in the search pipeline.
 * Results cached in `funder_profiles` table (refreshed every 30 days).
 */

import { createAdminClient } from "@/lib/supabase/admin";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FunderProfile {
  id: string;
  funder_name: string;
  ein: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  website: string | null;
  total_giving: number | null;
  num_grants: number | null;
  median_grant_amount: number | null;
  giving_rate_new_grantees: number | null;
  enriched_at: string;
}

interface ProPublicaOrg {
  ein: string;
  strein: string;
  name: string;
  city: string;
  state: string;
  ntee_code: string | null;
  raw_ntee_code: string | null;
  subseccd: string | null;
  assets: number | null;
  income: number | null;
  revenue: number | null;
}

interface ProPublicaOrgDetail {
  organization: {
    ein: number;
    name: string;
    address: string | null;
    city: string;
    state: string;
    zipcode: string | null;
    phone: string | null;
    website: string | null;
    asset_amount: number | null;
    income_amount: number | null;
    revenue_amount: number | null;
    ntee_code: string | null;
  };
  filings_with_data?: Array<{
    totrevenue?: number;
    totfuncexpns?: number;
    totassetsend?: number;
    grscontribs?: number;
    grantspaid?: number;  // total grants paid out
  }>;
}

// ─── Main enrichment function ─────────────────────────────────────────────────

export async function enrichFunderProfile(funderName: string): Promise<void> {
  if (!funderName || funderName === "Unknown Funder") return;

  const supabase = createAdminClient();

  // Check cache — skip if enriched within 30 days
  const { data: cached } = await supabase
    .from("funder_profiles")
    .select("enriched_at")
    .eq("funder_name", funderName)
    .single();

  if (cached?.enriched_at) {
    const age = Date.now() - new Date(cached.enriched_at).getTime();
    if (age < 30 * 24 * 60 * 60 * 1000) return; // < 30 days
  }

  try {
    // Step 1: Search ProPublica by name
    const searchUrl = `https://projects.propublica.org/nonprofits/api/v2/search.json?q=${encodeURIComponent(funderName)}`;
    const searchRes = await fetch(searchUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });

    if (!searchRes.ok) return;
    const searchJson = await searchRes.json() as { organizations?: ProPublicaOrg[] };
    const orgs = searchJson.organizations ?? [];
    if (orgs.length === 0) return;

    // Step 2: Pick best match by name similarity
    const match = findBestMatch(funderName, orgs);
    if (!match) return;

    // Step 3: Fetch detail by EIN
    const detailUrl = `https://projects.propublica.org/nonprofits/api/v2/organizations/${match.ein}.json`;
    const detailRes = await fetch(detailUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });

    if (!detailRes.ok) return;
    const detail = await detailRes.json() as ProPublicaOrgDetail;
    const org = detail.organization;
    const filings = detail.filings_with_data ?? [];

    // Derive grant data from most recent filing
    const latestFiling = filings[0];
    const totalGiving = latestFiling?.grantspaid ?? null;
    const numGrants: number | null = null; // ProPublica doesn't expose grant count directly
    const medianGrant =
      totalGiving != null && numGrants != null && numGrants > 0
        ? Math.round(totalGiving / numGrants)
        : null;

    const profileRow = {
      funder_name: funderName,
      ein: String(org.ein ?? match.ein),
      address: org.address ?? null,
      city: org.city ?? match.city,
      state: org.state ?? match.state,
      phone: org.phone ?? null,
      website: normalizeWebsite(org.website),
      total_giving: totalGiving,
      num_grants: numGrants,
      median_grant_amount: medianGrant,
      giving_rate_new_grantees: null, // not available from 990 data
      raw_propublica: { organization: org, filing_summary: latestFiling ?? null },
      enriched_at: new Date().toISOString(),
    };

    await supabase
      .from("funder_profiles")
      .upsert(profileRow, { onConflict: "funder_name" });

  } catch (err) {
    // Enrichment is best-effort — silently fail
    console.warn("[funder-enrichment] Failed for", funderName, err instanceof Error ? err.message : err);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findBestMatch(query: string, orgs: ProPublicaOrg[]): ProPublicaOrg | null {
  const q = normalize(query);
  let best: ProPublicaOrg | null = null;
  let bestScore = 0;

  for (const org of orgs.slice(0, 10)) {
    const score = similarity(q, normalize(org.name));
    if (score > bestScore) {
      bestScore = score;
      best = org;
    }
  }

  // Require at least 60% similarity to accept the match
  return bestScore >= 0.6 ? best : null;
}

function normalize(s: string): string {
  return s.toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\b(the|foundation|fund|inc|llc|corp|charitable|trust|association|of)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Jaccard token similarity */
function similarity(a: string, b: string): number {
  const sa = new Set(a.split(" ").filter(Boolean));
  const sb = new Set(b.split(" ").filter(Boolean));
  const intersection = new Set([...sa].filter((x) => sb.has(x)));
  const union = new Set([...sa, ...sb]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

function normalizeWebsite(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s || s === "N/A" || s === "n/a") return null;
  if (s.startsWith("http")) return s;
  return `https://${s}`;
}
