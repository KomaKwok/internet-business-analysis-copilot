import { buildAnalysisPrompt } from "@/lib/analysis/prompt";
import { buildValuation } from "@/lib/analysis/valuation";
import { Locale } from "@/components/language-provider";
import { callDeepSeek } from "@/lib/llm/deepseek";
import { getMockAnalysis } from "@/lib/mock-data";
import { searchCompanyContext } from "@/lib/search/bocha";
import { AssumptionSet, CompanyAnalysis, FinancialSnapshot, SourceLink } from "@/lib/types";
import { getFinancialSnapshot } from "@/lib/finance/provider";
import { getSecRevenue, getSecCompanyName } from "@/lib/finance/sec";
import { appConfig } from "@/lib/config";

function dedupeSources(sources: SourceLink[]): SourceLink[] {
  const seen = new Set<string>();
  return sources.filter((source) => {
    if (!source.url || seen.has(source.url)) {
      return false;
    }
    seen.add(source.url);
    return true;
  });
}

function toFiniteNumber(value: unknown): number | undefined {
  const num = typeof value === "string" ? Number(value.replace(/[, ]/g, "")) : value;
  return typeof num === "number" && Number.isFinite(num) ? num : undefined;
}

/** Keep only the financial figures the model actually pulled from sources. */
function sanitizeExtractedFinancials(raw: unknown): Partial<FinancialSnapshot> {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  const input = raw as Record<string, unknown>;
  const out: Partial<FinancialSnapshot> = {};
  const numericKeys = [
    "revenue",
    "marketCap",
    "currentPrice",
    "dilutedShares",
    "netCashOrDebt",
    "freeCashFlow",
    "operatingMargin"
  ] as const;

  for (const key of numericKeys) {
    const value = toFiniteNumber(input[key]);
    if (value !== undefined) {
      out[key] = value;
    }
  }

  if (typeof input.fiscalYear === "string" && input.fiscalYear.trim()) {
    out.fiscalYear = input.fiscalYear.trim();
  }

  if (Array.isArray(input.revenueHistory)) {
    const history = input.revenueHistory
      .map((point) => {
        const record = point as Record<string, unknown>;
        return { year: toFiniteNumber(record?.year), revenue: toFiniteNumber(record?.revenue) };
      })
      .filter((point): point is { year: number; revenue: number } =>
        point.year !== undefined && point.revenue !== undefined
      )
      .sort((a, b) => a.year - b.year);
    if (history.length) {
      out.revenueHistory = history;
    }
  }

  return out;
}

export async function generateCompanyAnalysis(params: {
  query: string;
  competitors?: string[];
  assumptions: AssumptionSet;
  locale: Locale;
}): Promise<CompanyAnalysis> {
  const ticker = params.query.toUpperCase();
  const competitors = params.competitors || [];
  const finance = await getFinancialSnapshot(ticker, params.assumptions);

  if (!appConfig.bochaApiKey || !appConfig.deepseekApiKey) {
    return getMockAnalysis(ticker, params.assumptions, params.locale, competitors);
  }

  // Use the official SEC company name when the ticker resolves there, so any
  // US-listed name shows correctly (not just the hardcoded sample companies).
  const secName = await getSecCompanyName(ticker);
  const companyName = secName || finance.companyName;

  // Two searches (business narrative + hard valuation figures) plus an
  // authoritative annual-revenue pull from SEC EDGAR, all in parallel.
  const [businessSources, financialSources, secRevenue] = await Promise.all([
    searchCompanyContext(
      `${companyName} ${ticker} business model revenue growth competition latest operating metrics`
    ),
    searchCompanyContext(
      `${companyName} ${ticker} stock price market cap shares outstanding revenue latest financial results`
    ),
    getSecRevenue(ticker)
  ]);

  const sources = dedupeSources([...businessSources, ...financialSources]);

  if (!sources.length) {
    return getMockAnalysis(ticker, params.assumptions, params.locale, competitors);
  }

  // The financial feed is only trustworthy when it actually came back live;
  // otherwise we let the model extract figures from the web sources instead.
  const liveSnapshot = finance.mode === "live" ? finance.financialSnapshot : null;

  const prompt = buildAnalysisPrompt({
    companyName,
    ticker,
    competitors,
    financialSnapshot: liveSnapshot,
    sources,
    locale: params.locale
  });

  try {
    const raw = await callDeepSeek(prompt.system, prompt.user);
    const parsed = JSON.parse(raw);

    // Prefer the live feed where present, fall back to source-extracted figures.
    const financialSnapshot: FinancialSnapshot = {
      ...sanitizeExtractedFinancials(parsed.financials),
      ...(liveSnapshot || {})
    };

    if (secRevenue) {
      // SEC EDGAR XBRL is authoritative annual USD revenue — trust it over the
      // model's best-effort extraction.
      financialSnapshot.revenue = secRevenue.revenue;
      financialSnapshot.revenueHistory = secRevenue.revenueHistory;
    } else {
      // No SEC data (non-filer / unresolved ADR): fall back to the extracted
      // figure, but drop a revenue base that is implausible against market cap
      // (catches currency mix-ups like RMB-as-USD and segment-only figures) so
      // the valuation degrades to an honest "insufficient data" instead of a
      // confidently wrong call.
      const baseRevenue =
        financialSnapshot.revenue ??
        financialSnapshot.revenueHistory?.[financialSnapshot.revenueHistory.length - 1]?.revenue;
      if (
        baseRevenue &&
        financialSnapshot.marketCap &&
        (baseRevenue > financialSnapshot.marketCap * 3 ||
          baseRevenue < financialSnapshot.marketCap / 50)
      ) {
        delete financialSnapshot.revenue;
        delete financialSnapshot.revenueHistory;
      }
    }

    // marketCap = price x shares. Backfill whichever of the three is missing.
    const { marketCap, currentPrice, dilutedShares } = financialSnapshot;
    if (!dilutedShares && marketCap && currentPrice) {
      financialSnapshot.dilutedShares = marketCap / currentPrice;
    } else if (!currentPrice && marketCap && dilutedShares) {
      financialSnapshot.currentPrice = marketCap / dilutedShares;
    } else if (!marketCap && currentPrice && dilutedShares) {
      financialSnapshot.marketCap = currentPrice * dilutedShares;
    }

    return {
      generatedAt: new Date().toISOString(),
      mode: "live",
      businessModelType: parsed.businessModelType,
      overview: {
        companyName,
        ticker,
        industry: parsed.overview.industry,
        coreProducts: parsed.overview.coreProducts,
        mainUserGroups: parsed.overview.mainUserGroups,
        revenueSegments: parsed.overview.revenueSegments,
        summary: parsed.overview.summary,
        dataSources: sources
      },
      user: parsed.user,
      useCase: parsed.useCase,
      product: parsed.product,
      revenue: parsed.revenue,
      cost: parsed.cost,
      growth: parsed.growth,
      competition: parsed.competition,
      kpis: parsed.kpis,
      competitorBenchmark: parsed.competitorBenchmark,
      risks: parsed.risks,
      analystView: parsed.analystView,
      valuation: buildValuation(financialSnapshot, params.assumptions),
      strategicDiagnosis: parsed.strategicDiagnosis,
      sources,
      financialSnapshot
    };
  } catch {
    return getMockAnalysis(ticker, params.assumptions, params.locale, competitors);
  }
}
