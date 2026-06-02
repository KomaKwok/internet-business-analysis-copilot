import { AssumptionSet, FinancialSnapshot, ValuationOutput } from "@/lib/types";

export function buildValuation(
  financialSnapshot: FinancialSnapshot,
  assumptions: AssumptionSet
): ValuationOutput {
  const baseRevenue =
    financialSnapshot.revenue ||
    financialSnapshot.revenueHistory?.[financialSnapshot.revenueHistory.length - 1]?.revenue ||
    10_000_000_000;
  const netCashOrDebt = financialSnapshot.netCashOrDebt || 0;
  const shares = financialSnapshot.dilutedShares || null;

  const forecast = Array.from({ length: 5 }, (_, index) => {
    const year = new Date().getFullYear() + index + 1;
    const revenue = baseRevenue * Math.pow(1 + assumptions.revenueGrowth, index + 1);
    const operatingIncome = revenue * assumptions.operatingMargin;
    const freeCashFlow = operatingIncome * (1 - assumptions.marketingExpenseRatio * 0.2);
    return { year, revenue, operatingIncome, freeCashFlow };
  });

  const pv = forecast.reduce((sum, item, index) => {
    return sum + item.freeCashFlow / Math.pow(1 + assumptions.discountRate, index + 1);
  }, 0);
  const terminalFcf = forecast[forecast.length - 1].freeCashFlow;
  const terminalValue =
    terminalFcf * (1 + assumptions.terminalGrowth) /
    Math.max(assumptions.discountRate - assumptions.terminalGrowth, 0.01);
  const terminalPv = terminalValue / Math.pow(1 + assumptions.discountRate, forecast.length);
  const enterpriseValue = pv + terminalPv;
  const equityValue = enterpriseValue + netCashOrDebt;

  const sensitivity = [-0.04, -0.02, 0, 0.02, 0.04].flatMap((revDelta) =>
    [-0.02, -0.01, 0, 0.01, 0.02].map((marginDelta) => {
      const revenueGrowth = assumptions.revenueGrowth + revDelta;
      const operatingMargin = Math.max(0.02, assumptions.operatingMargin + marginDelta);
      const scenarioForecast = Array.from({ length: 5 }, (_, index) => {
        const revenue = baseRevenue * Math.pow(1 + revenueGrowth, index + 1);
        return revenue * operatingMargin * (1 - assumptions.marketingExpenseRatio * 0.2);
      });
      const scenarioPv = scenarioForecast.reduce((sum, fcf, index) => {
        return sum + fcf / Math.pow(1 + assumptions.discountRate, index + 1);
      }, 0);
      const scenarioTv =
        scenarioForecast[scenarioForecast.length - 1] * (1 + assumptions.terminalGrowth) /
        Math.max(assumptions.discountRate - assumptions.terminalGrowth, 0.01);
      const scenarioEquity =
        scenarioPv + scenarioTv / Math.pow(1 + assumptions.discountRate, 5) + netCashOrDebt;
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
    valuePerShare: shares ? equityValue / shares : null,
    forecast,
    sensitivity
  };
}
