import { buildAnalysisPrompt } from "@/lib/analysis/prompt";
import { buildValuation } from "@/lib/analysis/valuation";
import { Locale } from "@/components/language-provider";
import { callDeepSeek } from "@/lib/llm/deepseek";
import { getMockAnalysis } from "@/lib/mock-data";
import { searchCompanyContext } from "@/lib/search/bocha";
import { AssumptionSet, CompanyAnalysis } from "@/lib/types";
import { getFinancialSnapshot } from "@/lib/finance/provider";
import { appConfig } from "@/lib/config";

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

  const sources = await searchCompanyContext(
    `${finance.companyName} business model revenue growth competition latest operating metrics`
  );

  if (!sources.length) {
    return getMockAnalysis(ticker, params.assumptions, params.locale, competitors);
  }

  const prompt = buildAnalysisPrompt({
    companyName: finance.companyName,
    ticker,
    competitors,
    financialSnapshot: finance.financialSnapshot,
    sources,
    locale: params.locale
  });

  try {
    const raw = await callDeepSeek(prompt.system, prompt.user);
    const parsed = JSON.parse(raw);
    return {
      generatedAt: new Date().toISOString(),
      mode: finance.mode,
      businessModelType: parsed.businessModelType,
      overview: {
        companyName: finance.companyName,
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
      valuation: buildValuation(finance.financialSnapshot, params.assumptions),
      strategicDiagnosis: parsed.strategicDiagnosis,
      sources,
      financialSnapshot: finance.financialSnapshot
    };
  } catch {
    return getMockAnalysis(ticker, params.assumptions, params.locale, competitors);
  }
}
