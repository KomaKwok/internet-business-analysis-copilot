import { FinancialSnapshot, SourceLink } from "@/lib/types";
import { Locale } from "@/components/language-provider";

export function buildAnalysisPrompt(params: {
  companyName: string;
  ticker: string;
  competitors: string[];
  financialSnapshot: FinancialSnapshot | null;
  sources: SourceLink[];
  locale: Locale;
}) {
  const sourceText = params.sources
    .map(
      (source, index) =>
        `[${index + 1}] ${source.title}\nURL: ${source.url}\nPublisher: ${source.publisher || "Unknown"}\nSnippet: ${source.snippet || "N/A"}`
    )
    .join("\n\n");

  const financialText = params.financialSnapshot
    ? JSON.stringify(params.financialSnapshot, null, 2)
    : "No reliable financial feed is available. Extract every financial figure from the web sources below instead.";

  const system = `
You are an internet business analyst, not a generic summarizer.

Follow this framework exactly:
1. User
2. Use Case
3. Product
4. Revenue
5. Cost
6. Growth
7. Competition
8. KPI
9. Risk
10. Analyst View

Rules:
- Separate facts from assumptions.
- Do not invent numerical data.
- If a number is unavailable, write "Needs verification".
- For the "financials" block, extract figures ONLY from the sources or the financial feed. Use absolute USD numbers, not text (e.g. 61750000000, never "61.75B" or "617.5亿"). Use null for any figure not found. Do not guess.
- ALL figures in "financials" must be in US dollars. "revenue" is TOTAL company revenue for the most recent FULL fiscal year (not a quarter, not a single segment), expressed in USD. If a source reports in another currency, give the USD figure. Prefer a full-year number; give your best figure rather than null unless you have no basis at all.
- "marketCap" and "currentPrice" must be consistent with "dilutedShares" (marketCap ≈ currentPrice × dilutedShares).
- Keep every search-based factual claim traceable to source URLs.
- Avoid vague consultant language.
- Be causal and commercially grounded.
- Return valid JSON only.
- Write the content in ${params.locale === "zh" ? "Simplified Chinese" : "English"}.
`;

  const user = `
Analyze ${params.companyName} (${params.ticker}) for an internet business analysis dashboard.

Financial snapshot:
${financialText}

Competitor hints:
${params.competitors.join(", ") || "Suggest relevant competitors"}

Web sources:
${sourceText || "No external sources available"}

Return JSON with this shape:
{
  "businessModelType": string,
  "overview": {
    "industry": string,
    "coreProducts": string[],
    "mainUserGroups": string[],
    "revenueSegments": string[],
    "summary": string
  },
  "financials": {
    "revenue": number | null,
    "marketCap": number | null,
    "currentPrice": number | null,
    "dilutedShares": number | null,
    "netCashOrDebt": number | null,
    "freeCashFlow": number | null,
    "operatingMargin": number | null,
    "fiscalYear": string,
    "revenueHistory": [{ "year": number, "revenue": number }]
  },
  "user": { "facts": string[], "assumptions": string[] },
  "useCase": { "facts": string[], "assumptions": string[] },
  "product": { "facts": string[], "assumptions": string[] },
  "revenue": { "facts": string[], "assumptions": string[] },
  "cost": { "facts": string[], "assumptions": string[] },
  "growth": { "facts": string[], "assumptions": string[] },
  "competition": { "facts": string[], "assumptions": string[] },
  "kpis": [{ "name": string, "whyItMatters": string, "publicAvailability": "Available" | "Partial" | "Unavailable" }],
  "competitorBenchmark": [{
    "company": string,
    "coreBusiness": string,
    "userBase": string,
    "revenueModel": string,
    "monetizationMethod": string,
    "competitiveAdvantage": string,
    "weakness": string,
    "keyRisk": string,
    "metricToWatch": string
  }],
  "risks": { "facts": string[], "assumptions": string[] },
  "analystView": {
    "mostImportantMetric": string,
    "biggestUncertainty": string,
    "managementQuestion": string
  },
  "strategicDiagnosis": {
    "currentGrowthDriver": string,
    "keyMetric": string,
    "bottleneck": string,
    "managementFocus": string,
    "coreQuestion": string,
    "verificationNeeds": string[]
  }
}
`;

  return { system, user };
}
