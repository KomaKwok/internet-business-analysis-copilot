import { getCached, setCached } from "@/lib/cache";

// SEC requires a descriptive User-Agent identifying the caller.
const SEC_USER_AGENT = "internet-business-analysis-copilot (contact: research@example.com)";
const CIK_MAP_TTL = 24 * 60 * 60; // 1 day
const CONCEPT_TTL = 12 * 60 * 60; // 12 hours

// Revenue is reported under a few different us-gaap concepts depending on the
// filer; we try them in order of how common/clean they are.
const REVENUE_CONCEPTS = [
  "RevenueFromContractWithCustomerExcludingAssessedTax",
  "Revenues",
  "RevenueFromContractWithCustomerIncludingAssessedTax"
];

type AnnualRevenue = { year: number; revenue: number };

async function secFetch<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { "User-Agent": SEC_USER_AGENT, Accept: "application/json" },
    next: { revalidate: CONCEPT_TTL }
  });
  if (!response.ok) {
    throw new Error(`SEC fetch failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

type TickerEntry = { cik: string; name: string };

async function resolveTicker(ticker: string): Promise<TickerEntry | null> {
  const cacheKey = "sec:cik-map";
  let map = getCached<Record<string, TickerEntry>>(cacheKey);
  if (!map) {
    const raw = await secFetch<Record<string, { cik_str: number; ticker: string; title?: string }>>(
      "https://www.sec.gov/files/company_tickers.json"
    );
    map = {};
    for (const entry of Object.values(raw)) {
      if (entry?.ticker) {
        map[entry.ticker.toUpperCase()] = {
          cik: String(entry.cik_str).padStart(10, "0"),
          name: entry.title || entry.ticker.toUpperCase()
        };
      }
    }
    setCached(cacheKey, map, CIK_MAP_TTL);
  }
  return map[ticker.toUpperCase()] || null;
}

/** Official company name from SEC's ticker registry, or null if unresolved. */
export async function getSecCompanyName(ticker: string): Promise<string | null> {
  const entry = await resolveTicker(ticker).catch(() => null);
  return entry?.name || null;
}

type ConceptResponse = {
  units?: Record<
    string,
    Array<{ start?: string; end?: string; val?: number; form?: string; filed?: string }>
  >;
};

/** Pull the latest full-year USD revenue figures straight from XBRL filings. */
function extractAnnualUsd(concept: ConceptResponse): AnnualRevenue[] {
  const usd = concept.units?.USD;
  if (!usd) {
    return [];
  }

  // Keep only full-year periods from annual reports (10-K / 20-F).
  const byYear = new Map<number, { revenue: number; filed: string }>();
  for (const point of usd) {
    if (!point.start || !point.end || typeof point.val !== "number") {
      continue;
    }
    if (point.form !== "10-K" && point.form !== "20-F") {
      continue;
    }
    const start = Date.parse(point.start);
    const end = Date.parse(point.end);
    const durationDays = (end - start) / (1000 * 60 * 60 * 24);
    if (durationDays < 350 || durationDays > 380) {
      continue; // skip quarterly / partial periods
    }
    const year = new Date(point.end).getUTCFullYear();
    const existing = byYear.get(year);
    // Prefer the most recently filed value for a given fiscal year (restatements).
    if (!existing || (point.filed || "") > existing.filed) {
      byYear.set(year, { revenue: point.val, filed: point.filed || "" });
    }
  }

  return [...byYear.entries()]
    .map(([year, { revenue }]) => ({ year, revenue }))
    .sort((a, b) => a.year - b.year);
}

/**
 * Authoritative annual revenue (USD) for a US-listed filer, from SEC EDGAR.
 * Returns null for tickers EDGAR cannot resolve (non-filers, some ADRs).
 */
export async function getSecRevenue(
  ticker: string
): Promise<{ revenue: number; revenueHistory: AnnualRevenue[] } | null> {
  try {
    const entry = await resolveTicker(ticker);
    if (!entry) {
      return null;
    }

    for (const concept of REVENUE_CONCEPTS) {
      let data: ConceptResponse | null = null;
      try {
        data = await secFetch<ConceptResponse>(
          `https://data.sec.gov/api/xbrl/companyconcept/CIK${entry.cik}/us-gaap/${concept}.json`
        );
      } catch {
        continue; // concept not reported by this filer
      }
      const annual = extractAnnualUsd(data);
      if (annual.length) {
        return {
          revenue: annual[annual.length - 1].revenue,
          revenueHistory: annual.slice(-4)
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}
