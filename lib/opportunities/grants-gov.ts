/**
 * Grants.gov public search API — real, live federal grant opportunities.
 * No API key required. Powers simpler.grants.gov.
 *
 * Docs: https://api.simpler.grants.gov/
 */

export interface GrantsGovOpportunity {
  opportunity_id: number;
  opportunity_title: string;
  opportunity_number: string;
  opportunity_status: string;
  agency_name: string;
  agency_code?: string;
  close_date: string | null;
  post_date?: string | null;
  award_ceiling: number | null;
  award_floor: number | null;
  summary_description: string | null;
  eligible_applicants: string[];
  funding_categories: string[];
  opportunity_url: string;
}

// Grants.gov funding category codes → human labels
const FUNDING_CATEGORY_LABELS: Record<string, string> = {
  AG: "Agriculture",
  AR: "Arts",
  BC: "Business and Commerce",
  CD: "Community Development",
  CP: "Consumer Protection",
  DPR: "Disaster Prevention and Relief",
  ED: "Education",
  ELT: "Employment, Labor, and Training",
  EN: "Energy",
  ENV: "Environment",
  FN: "Food and Nutrition",
  HL: "Health",
  HO: "Housing",
  HU: "Humanities",
  IS: "Information and Statistics",
  ISS: "Income Security and Social Services",
  LJL: "Law, Justice and Legal Services",
  NR: "Natural Resources",
  RD: "Regional Development",
  ST: "Science and Technology",
  T: "Transportation",
  VE: "Veterans Affairs",
  O: "Other",
};

// Map plain-text program areas to Grants.gov funding category codes
function mapProgramAreaToCodes(programArea: string): string[] {
  const area = programArea.toLowerCase();
  const codes: string[] = [];
  if (/mental.?health|behavioral|substance|addiction|trauma|counseling|therapy/.test(area)) codes.push("HL", "ISS");
  if (/health|medical|wellness|disease|public.?health/.test(area)) codes.push("HL");
  if (/education|school|curriculum|literacy|youth.?learn/.test(area)) codes.push("ED");
  if (/veteran|military/.test(area)) codes.push("VE");
  if (/housing|homeless|shelter/.test(area)) codes.push("HO");
  if (/workforce|employment|job|labor/.test(area)) codes.push("ELT");
  if (/community|neighborhood|social.?service/.test(area)) codes.push("CD", "ISS");
  if (/arts|culture|humanities|heritage|history|preserv/.test(area)) codes.push("AR", "HU");
  if (/environment|climate|conservation/.test(area)) codes.push("ENV", "NR");
  if (/food|nutrition|hunger/.test(area)) codes.push("FN");
  if (/justice|legal|civil.?right/.test(area)) codes.push("LJL");
  if (/science|research|technology/.test(area)) codes.push("ST");
  return [...new Set(codes)];
}

export async function searchGrantsGov(params: {
  keywords: string;
  programArea: string;
  geography: string;
  funderType: string;
  limit?: number;
}): Promise<GrantsGovOpportunity[]> {
  // Only query federal grants
  if (params.funderType && params.funderType !== "federal") return [];

  const query = [params.keywords, params.programArea]
    .filter(Boolean)
    .join(" ");

  if (!query.trim()) return [];

  const fundingCategoryCodes = mapProgramAreaToCodes(params.programArea);

  const requestBody: Record<string, unknown> = {
    query: query.trim(),
    filters: {
      opportunity_status: { one_of: ["posted", "forecasted"] },
    },
    pagination: {
      page_size: params.limit ?? 20,
      page_offset: 1,
      sort_by: "relevancy",
      order_by: "desc",
    },
  };

  if (fundingCategoryCodes.length > 0) {
    (requestBody.filters as Record<string, unknown>).funding_category = {
      one_of: fundingCategoryCodes,
    };
  }

  const res = await fetch("https://api.simpler.grants.gov/v1/opportunities/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    console.warn(`[grants.gov] API returned ${res.status}`);
    return [];
  }

  const json = await res.json();
  const raw: Record<string, unknown>[] = Array.isArray(json?.data)
    ? json.data
    : [];

  return raw.map((item): GrantsGovOpportunity => {
    const summary = (item.summary as Record<string, unknown>) ?? {};
    const cats: string[] = Array.isArray(item.funding_categories)
      ? (item.funding_categories as string[])
      : [];

    const catLabels = cats
      .map((c) => FUNDING_CATEGORY_LABELS[c] ?? c)
      .join(", ");

    return {
      opportunity_id: Number(item.opportunity_id ?? 0),
      opportunity_title: String(item.opportunity_title ?? ""),
      opportunity_number: String(item.opportunity_number ?? ""),
      opportunity_status: String(item.opportunity_status ?? ""),
      agency_name: String(item.agency ?? item.agency_name ?? ""),
      close_date: item.close_date ? String(item.close_date) : null,
      post_date: item.post_date ? String(item.post_date) : null,
      award_ceiling:
        summary.award_ceiling != null ? Number(summary.award_ceiling) : null,
      award_floor:
        summary.award_floor != null ? Number(summary.award_floor) : null,
      summary_description: summary.summary_description
        ? String(summary.summary_description)
        : null,
      eligible_applicants: Array.isArray(summary.eligible_applicants)
        ? summary.eligible_applicants.map(String)
        : [],
      funding_categories: cats,
      opportunity_url: `https://simpler.grants.gov/opportunity/${item.opportunity_id}`,
    };
  });
}
