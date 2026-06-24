import { AssumptionSet, FinancialSnapshot, ValuationOutput, ValuationVerdict } from "@/lib/types";

// Simplified but defensible assumptions for a transparent DCF.
const TAX_RATE = 0.21;

function getBaseRevenue(snapshot: FinancialSnapshot) {
  return (
    snapshot.revenue ||
    snapshot.revenueHistory?.[snapshot.revenueHistory.length - 1]?.revenue ||
    10_000_000_000
  );
}

/**
 * Project 5 years of free cash flow.
 * FCF = NOPAT - reinvestment, where reinvestment scales with incremental revenue.
 * Faster growth therefore costs more near-term cash, which is the real economic trade-off.
 */
function projectFreeCashFlows(
  baseRevenue: number,
  revenueGrowth: number,
  operatingMargin: number,
  reinvestmentRate: number,
  startYear: number
) {
  let prevRevenue = baseRevenue;
  return Array.from({ length: 5 }, (_, index) => {
    const year = startYear + index + 1;
    const revenue = baseRevenue * Math.pow(1 + revenueGrowth, index + 1);
    const operatingIncome = revenue * operatingMargin;
    const nopat = operatingIncome * (1 - TAX_RATE);
    const incrementalRevenue = Math.max(0, revenue - prevRevenue);
    const reinvestment = incrementalRevenue * reinvestmentRate;
    const freeCashFlow = nopat - reinvestment;
    prevRevenue = revenue;
    return { year, revenue, operatingIncome, freeCashFlow };
  });
}

function discountToEquity(
  forecast: Array<{ freeCashFlow: number }>,
  discountRate: number,
  terminalGrowth: number,
  netCashOrDebt: number
) {
  const pv = forecast.reduce(
    (sum, item, index) => sum + item.freeCashFlow / Math.pow(1 + discountRate, index + 1),
    0
  );
  const terminalFcf = forecast[forecast.length - 1].freeCashFlow;
  const terminalValue =
    (terminalFcf * (1 + terminalGrowth)) / Math.max(discountRate - terminalGrowth, 0.01);
  const terminalPv = terminalValue / Math.pow(1 + discountRate, forecast.length);
  const enterpriseValue = pv + terminalPv;
  const equityValue = enterpriseValue + netCashOrDebt;
  return { enterpriseValue, equityValue };
}

function classifyVerdict(upsideDownside: number | null): ValuationVerdict {
  if (upsideDownside === null) {
    return "unknown";
  }
  if (upsideDownside > 0.15) {
    return "undervalued";
  }
  if (upsideDownside < -0.15) {
    return "overvalued";
  }
  return "fair";
}

/**
 * Solve for the revenue growth that makes the DCF equity value equal the
 * company's market cap, holding margin / discount / reinvestment fixed. This is
 * the "what is the market betting on" anchor that turns the model into a
 * judgment. We compare total equity value to total market cap rather than
 * per-share to price, because market cap extracts far more reliably than a
 * clean (price, share-count) pair — especially for ADRs with share-class ratios.
 */
function solveMarketImpliedGrowth(params: {
  baseRevenue: number;
  operatingMargin: number;
  discountRate: number;
  terminalGrowth: number;
  reinvestmentRate: number;
  netCashOrDebt: number;
  marketEquity: number;
  startYear: number;
}): number | null {
  let lo = -0.1;
  let hi = 0.6;

  const valueAt = (growth: number) => {
    const forecast = projectFreeCashFlows(
      params.baseRevenue,
      growth,
      params.operatingMargin,
      params.reinvestmentRate,
      params.startYear
    );
    const { equityValue } = discountToEquity(
      forecast,
      params.discountRate,
      params.terminalGrowth,
      params.netCashOrDebt
    );
    return equityValue;
  };

  // Value is monotonically increasing in growth; bisect if the cap is bracketed.
  if (valueAt(lo) > params.marketEquity || valueAt(hi) < params.marketEquity) {
    return null;
  }
  for (let i = 0; i < 60; i += 1) {
    const mid = (lo + hi) / 2;
    if (valueAt(mid) > params.marketEquity) {
      hi = mid;
    } else {
      lo = mid;
    }
  }
  return (lo + hi) / 2;
}

export function buildValuation(
  financialSnapshot: FinancialSnapshot,
  assumptions: AssumptionSet
): ValuationOutput {
  const baseRevenue = getBaseRevenue(financialSnapshot);
  const netCashOrDebt = financialSnapshot.netCashOrDebt || 0;
  const shares = financialSnapshot.dilutedShares || null;
  const reinvestmentRate = assumptions.reinvestmentRate;
  const startYear = new Date().getFullYear();

  const forecast = projectFreeCashFlows(
    baseRevenue,
    assumptions.revenueGrowth,
    assumptions.operatingMargin,
    reinvestmentRate,
    startYear
  );
  const { enterpriseValue, equityValue } = discountToEquity(
    forecast,
    assumptions.discountRate,
    assumptions.terminalGrowth,
    netCashOrDebt
  );
  const valuePerShare = shares ? equityValue / shares : null;

  const currentPrice =
    financialSnapshot.currentPrice ??
    (financialSnapshot.marketCap && shares ? financialSnapshot.marketCap / shares : null);

  // Anchor on total market cap (reliable) rather than per-share price (often not).
  const marketEquity =
    financialSnapshot.marketCap ??
    (financialSnapshot.currentPrice && shares ? financialSnapshot.currentPrice * shares : null);

  // The DCF is only meaningful when the revenue base is a real figure, not the
  // fallback placeholder. Without it we refuse to assert an over/undervalued call.
  const hasReliableBase = Boolean(
    financialSnapshot.revenue || financialSnapshot.revenueHistory?.length
  );

  const upsideDownside =
    hasReliableBase && marketEquity ? equityValue / marketEquity - 1 : null;

  const marketImpliedGrowth =
    hasReliableBase && marketEquity
      ? solveMarketImpliedGrowth({
          baseRevenue,
          operatingMargin: assumptions.operatingMargin,
          discountRate: assumptions.discountRate,
          terminalGrowth: assumptions.terminalGrowth,
          reinvestmentRate,
          netCashOrDebt,
          marketEquity,
          startYear
        })
      : null;

  const sensitivity = [-0.04, -0.02, 0, 0.02, 0.04].flatMap((revDelta) =>
    [-0.02, -0.01, 0, 0.01, 0.02].map((marginDelta) => {
      const revenueGrowth = assumptions.revenueGrowth + revDelta;
      const operatingMargin = Math.max(0.02, assumptions.operatingMargin + marginDelta);
      const scenarioForecast = projectFreeCashFlows(
        baseRevenue,
        revenueGrowth,
        operatingMargin,
        reinvestmentRate,
        startYear
      );
      const { equityValue: scenarioEquity } = discountToEquity(
        scenarioForecast,
        assumptions.discountRate,
        assumptions.terminalGrowth,
        netCashOrDebt
      );
      return {
        x: Number((revenueGrowth * 100).toFixed(1)),
        y: Number((operatingMargin * 100).toFixed(1)),
        value: shares ? scenarioEquity / shares : scenarioEquity / 1_000_000_000
      };
    })
  );

  return {
    currency: "USD",
    equityValue,
    enterpriseValue,
    valuePerShare: hasReliableBase ? valuePerShare : null,
    currentPrice,
    marketEquity,
    upsideDownside,
    marketImpliedGrowth,
    verdict: upsideDownside !== null ? classifyVerdict(upsideDownside) : "unknown",
    forecast,
    sensitivity
  };
}
