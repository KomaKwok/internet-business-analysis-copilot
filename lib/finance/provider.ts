import { appConfig } from "@/lib/config";
import { getMockAnalysis } from "@/lib/mock-data";
import { AssumptionSet, FinancialSnapshot } from "@/lib/types";

type FinanceResult = {
  mode: "mock" | "live";
  companyName: string;
  ticker: string;
  financialSnapshot: FinancialSnapshot;
};

const COMPANY_NAME_MAP: Record<string, string> = {
  PDD: "PDD Holdings",
  BABA: "Alibaba Group",
  TCEHY: "Tencent Holdings",
  UBER: "Uber Technologies",
  NFLX: "Netflix",
  SPOT: "Spotify",
  DASH: "DoorDash",
  MEITUAN: "Meituan"
};

async function fetchYahooChart(ticker: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=5y&interval=1mo`;
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    next: { revalidate: 3600 }
  });
  if (!response.ok) {
    throw new Error(`Yahoo chart fetch failed: ${response.status}`);
  }
  return response.json();
}

async function fetchYahooQuoteSummary(ticker: string) {
  const modules = [
    "price",
    "summaryProfile",
    "financialData",
    "defaultKeyStatistics",
    "incomeStatementHistory"
  ].join(",");
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=${modules}`;
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    next: { revalidate: 3600 }
  });
  if (!response.ok) {
    throw new Error(`Yahoo summary fetch failed: ${response.status}`);
  }
  return response.json();
}

function pickRaw(node: unknown): number | undefined {
  if (!node || typeof node !== "object") {
    return undefined;
  }
  if ("raw" in node && typeof (node as { raw?: unknown }).raw === "number") {
    return (node as { raw: number }).raw;
  }
  return undefined;
}

async function getYahooSnapshot(ticker: string): Promise<FinanceResult> {
  const [summaryData, chartData] = await Promise.all([
    fetchYahooQuoteSummary(ticker),
    fetchYahooChart(ticker)
  ]);

  const result = summaryData?.quoteSummary?.result?.[0];
  if (!result) {
    throw new Error("No Yahoo summary result");
  }

  const annualSeries =
    result?.incomeStatementHistory?.incomeStatementHistory?.map(
      (statement: { endDate?: { fmt?: string }; totalRevenue?: { raw?: number } }) => ({
        year: Number(statement.endDate?.fmt?.slice(0, 4) || 0),
        revenue: statement.totalRevenue?.raw || 0
      })
    ).filter((point: { year: number; revenue: number }) => point.year && point.revenue) || [];

  const chartResult = chartData?.chart?.result?.[0];
  const marketPrice = chartResult?.meta?.regularMarketPrice;

  return {
    mode: "live",
    companyName: result?.price?.longName || COMPANY_NAME_MAP[ticker] || ticker,
    ticker,
    financialSnapshot: {
      marketCap: pickRaw(result?.price?.marketCap),
      revenue: pickRaw(result?.financialData?.totalRevenue),
      grossMargin: pickRaw(result?.financialData?.grossMargins),
      operatingMargin: pickRaw(result?.financialData?.operatingMargins),
      freeCashFlow: pickRaw(result?.financialData?.freeCashflow),
      netCashOrDebt:
        (pickRaw(result?.financialData?.totalCash) || 0) -
        (pickRaw(result?.financialData?.totalDebt) || 0),
      dilutedShares: pickRaw(result?.defaultKeyStatistics?.sharesOutstanding),
      fiscalYear: result?.price?.exchangeName || "Needs verification",
      revenueHistory: annualSeries.reverse(),
      ...(marketPrice ? { marketCap: pickRaw(result?.price?.marketCap) } : {})
    }
  };
}

export async function getFinancialSnapshot(
  ticker: string,
  assumptions?: AssumptionSet
): Promise<FinanceResult> {
  const provider = appConfig.financialDataProvider.toLowerCase();
  if (provider === "mock" || !provider) {
    const mock = getMockAnalysis(ticker, assumptions);
    return {
      mode: "mock",
      companyName: mock.overview.companyName,
      ticker: mock.overview.ticker,
      financialSnapshot: mock.financialSnapshot
    };
  }

  try {
    if (provider === "yahoo") {
      return await getYahooSnapshot(ticker);
    }
    throw new Error(`Unsupported provider: ${provider}`);
  } catch (error) {
    if (!appConfig.enableMockMode) {
      throw error;
    }
    const mock = getMockAnalysis(ticker, assumptions);
    return {
      mode: "mock",
      companyName: mock.overview.companyName,
      ticker: mock.overview.ticker,
      financialSnapshot: mock.financialSnapshot
    };
  }
}
