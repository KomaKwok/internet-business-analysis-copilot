import { FinancialSnapshot, SourceLink } from "@/lib/types";
import { Locale } from "@/components/language-provider";

export function buildAnalysisPrompt(params: {
  companyName: string;
  ticker: string;
  competitors: string[];
  financialSnapshot: FinancialSnapshot;
  sources: SourceLink[];
  locale: Locale;
}) {
  const sourceText = params.sources
    .map(
      (source, index) =>
        `[${index + 1}] ${source.title}\nURL: ${source.url}\nPublisher: ${source.publisher || "Unknown"}\nSnippet: ${source.snippet || "N/A"}`
    )
    .join("\n\n");

  const financialText = JSON.stringify(params.financialSnapshot, null, 2);

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
- Keep every search-based factual claim traceable to source URLs.
- Avoid vague consultant language.
- Be causal and commercially grounded.
- Return valid JSON only.
- Write the content in ${params.locale === "zh" ? "Simplified Chinese" : "English"}.
`;

  const user = `
Analyze ${params.companyName} (${params.ticker}) for an interview-style internet business analysis dashboard.

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
    "interviewAngle": string,
    "verificationNeeds": string[]
  }
}
`;

  return { system, user };
}
