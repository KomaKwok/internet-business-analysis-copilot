import { Locale } from "@/components/language-provider";
import { AssumptionSet, CompanyAnalysis } from "@/lib/types";

const defaultAssumptions: AssumptionSet = {
  revenueGrowth: 0.18,
  operatingMargin: 0.16,
  discountRate: 0.1,
  terminalGrowth: 0.03,
  userGrowth: 0.12,
  arpuGrowth: 0.05,
  takeRateChange: 0.01,
  marketingExpenseRatio: 0.18
};

function buildMockValuation(assumptions: AssumptionSet) {
  const baseRevenue = 36_000_000_000;
  const forecast = Array.from({ length: 5 }, (_, index) => {
    const year = 2026 + index;
    const revenue = baseRevenue * Math.pow(1 + assumptions.revenueGrowth, index + 1);
    const operatingIncome = revenue * assumptions.operatingMargin;
    const freeCashFlow = operatingIncome * 0.78;
    return { year, revenue, operatingIncome, freeCashFlow };
  });

  const pv = forecast.reduce((sum, point, index) => {
    return sum + point.freeCashFlow / Math.pow(1 + assumptions.discountRate, index + 1);
  }, 0);
  const terminalBase = forecast[forecast.length - 1].freeCashFlow;
  const terminalValue =
    terminalBase * (1 + assumptions.terminalGrowth) /
    Math.max(assumptions.discountRate - assumptions.terminalGrowth, 0.01);
  const terminalPv = terminalValue / Math.pow(1 + assumptions.discountRate, forecast.length);
  const enterpriseValue = pv + terminalPv;
  const equityValue = enterpriseValue + 4_000_000_000;
  const dilutedShares = 1_850_000_000;

  const sensitivity = [-0.04, -0.02, 0, 0.02, 0.04].flatMap((growthDelta) =>
    [-0.02, -0.01, 0, 0.01, 0.02].map((discountDelta) => {
      const growth = assumptions.revenueGrowth + growthDelta;
      const discount = assumptions.discountRate + discountDelta;
      const localForecast = Array.from({ length: 5 }, (_, index) => {
        const revenue = baseRevenue * Math.pow(1 + growth, index + 1);
        return revenue * assumptions.operatingMargin * 0.78;
      });
      const localPv = localForecast.reduce((sum, fcf, index) => {
        return sum + fcf / Math.pow(1 + discount, index + 1);
      }, 0);
      const localTv =
        localForecast[localForecast.length - 1] * (1 + assumptions.terminalGrowth) /
        Math.max(discount - assumptions.terminalGrowth, 0.01);
      const localEv = localPv + localTv / Math.pow(1 + discount, 5);
      return {
        x: Number(((growth || 0) * 100).toFixed(1)),
        y: Number((discount * 100).toFixed(1)),
        value: localEv / dilutedShares
      };
    })
  );

  return {
    currency: "USD",
    equityValue,
    enterpriseValue,
    valuePerShare: equityValue / dilutedShares,
    forecast,
    sensitivity
  };
}

export function getMockAnalysis(
  query: string,
  assumptions: AssumptionSet = defaultAssumptions,
  locale: Locale = "en",
  competitors: string[] = []
): CompanyAnalysis {
  const ticker = query.toUpperCase();
  const zh = locale === "zh";
  const pickedCompetitors = competitors.length
    ? competitors.slice(0, 2)
    : ["Alibaba", "JD.com"];

  const competitorRows = pickedCompetitors.map((name, index) => ({
    company: name,
    coreBusiness:
      zh
        ? index === 0
          ? "综合平台业务"
          : "垂直零售或平台业务"
        : index === 0
          ? "Broad platform business"
          : "Vertical retail or platform business",
    userBase:
      zh
        ? index === 0
          ? "多品类大盘用户"
          : "高频或强心智用户"
        : index === 0
          ? "Large multi-category base"
          : "Higher-frequency or high-intent users",
    revenueModel:
      zh
        ? index === 0
          ? "广告、佣金、服务费"
          : "零售利润、佣金、服务费"
        : index === 0
          ? "Ads, commissions, service fees"
          : "Retail margin, commissions, service fees",
    monetizationMethod:
      zh ? "商家投放、抽成或服务收费" : "Merchant spend, take rate, or service fees",
    competitiveAdvantage:
      zh
        ? index === 0
          ? "生态覆盖更广"
          : "履约或品类心智更强"
        : index === 0
          ? "Broader ecosystem coverage"
          : "Stronger fulfillment or category positioning",
    weakness:
      zh
        ? index === 0
          ? "业务复杂度更高"
          : "成本基座更重"
        : index === 0
          ? "Higher execution complexity"
          : "Heavier cost base",
    keyRisk:
      zh
        ? index === 0
          ? "竞争导致商家预算分流"
          : "利润率承压"
        : index === 0
          ? "Merchant budget diversion"
          : "Margin pressure",
    metricToWatch:
      zh
        ? index === 0
          ? "商家变现增速"
          : "订单频次 / 利润率"
        : index === 0
          ? "Merchant monetization growth"
          : "Order frequency / margin"
  }));

  return {
    generatedAt: new Date().toISOString(),
    mode: "mock",
    businessModelType: "E-commerce platform",
    overview: {
      companyName: ticker === "PDD" ? "PDD Holdings" : `${ticker} Holdings`,
      ticker,
      industry: zh ? "互联网平台" : "Internet platform",
      coreProducts: zh ? ["消费平台", "商家工具", "广告产品"] : ["Consumer marketplace", "Merchant tools", "Ad products"],
      mainUserGroups: zh ? ["消费者", "商家", "广告主"] : ["Consumers", "Merchants", "Advertisers"],
      revenueSegments: zh ? ["在线营销服务", "交易服务", "增值工具"] : ["Online marketing services", "Transaction services", "Value-added tools"],
      summary:
        zh
          ? "当前为 mock mode 演示内容。配置 Bocha 和 DeepSeek key 后可切换为实时搜索驱动分析。"
          : "Mock mode overview. Replace with live search-backed output after configuring Bocha and DeepSeek keys.",
      dataSources: [
        { title: "Mock data mode", url: "https://example.com/mock-mode", publisher: "Local" }
      ]
    },
    user: {
      facts: zh
        ? ["核心用户分为需求侧消费者和供给侧商家。", "广告主之所以重要，是因为商家广告预算建立在 GMV 之上，是额外的变现层。"]
        : [
            "Core users split into demand-side consumers and supply-side merchants.",
            "Advertisers matter economically because merchant ad budgets are a monetization layer on top of GMV."
          ],
      assumptions: zh
        ? ["当前 mock mode 下的用户结构与行为为推断，仍需核实。"]
        : ["User mix and behavior are inferred in mock mode and need verification."]
    },
    useCase: {
      facts: zh
        ? ["消费者使用平台的核心诉求是更高性价比和更便捷履约。", "商家使用平台的核心诉求是获取流量并转化为订单。"]
        : [
            "Consumers use the platform for price discovery and convenient fulfillment.",
            "Merchants use the platform for traffic acquisition and conversion."
          ],
      assumptions: zh ? ["痛点优先级需要实时来源核实。"] : ["Pain-point ranking requires live source verification."]
    },
    product: {
      facts: zh
        ? ["主要流量入口是消费者侧的推荐流和搜索入口。", "主要变现引擎是商家营销投放和交易服务费。"]
        : [
            "Traffic entrance is the consumer marketplace feed and search surface.",
            "Main monetization engine is merchant marketing spend plus transaction fees."
          ],
      assumptions: zh ? ["各变现模块占比仍需财报核实。"] : ["Relative monetization mix needs verification from filings."]
    },
    revenue: {
      facts: zh
        ? ["收入主要由 GMV、Take Rate、广告负载和商家 ROI 共同驱动。", "如果转化率提升快于用户增长，收入仍然可以继续复合增长。"]
        : [
            "Revenue is mainly driven by GMV, take rate, ad load, and merchant ROI.",
            "If conversion rises faster than user growth, revenue can still compound."
          ],
      assumptions: zh ? ["当前分部贡献为 mock 数据，不代表财报披露。"] : ["Segment contribution is mocked and not filing-backed in this mode."]
    },
    cost: {
      facts: zh
        ? ["核心成本驱动包括流量获取、云基础设施和研发。", "当复购能够摊薄新增获客费用时，利润率会改善。"]
        : [
            "Core cost drivers are traffic acquisition, cloud infrastructure, and R&D.",
            "Margin improves when repeat usage offsets incremental acquisition spend."
          ],
      assumptions: zh ? ["客服和履约成本结构会随公司模式不同而变化。"] : ["Support and fulfillment cost mix varies by company model."]
    },
    growth: {
      facts: zh
        ? ["首要增长引擎是在既有流量基础上提升变现效率。", "如果国内渗透接近成熟，国际化会成为第二增长曲线。"]
        : [
            "The primary growth engine is better monetization on top of existing engagement.",
            "International expansion is a secondary lever if domestic penetration matures."
          ],
      assumptions: zh ? ["当前增长排序为通用判断，非实时结论。"] : ["Growth ranking is generic in mock mode."]
    },
    competition: {
      facts: zh
        ? ["竞争通常围绕价格力、供给密度、商家 ROI 和用户习惯展开。", "最强护城河往往是复购行为与商家需求相互强化。"]
        : [
            "Competition typically centers on price, supply density, merchant ROI, and user habit.",
            "The strongest moat is repeated buyer behavior reinforced by merchant demand."
          ],
      assumptions: zh ? ["竞争强度会随地区和品类变化。"] : ["Competitor intensity differs by geography and category."]
    },
    kpis: [
      {
        name: "GMV",
        whyItMatters: zh
          ? "GMV 是需求侧规模基数，支撑广告收入和交易服务收入。"
          : "GMV is the demand-side volume base that supports ads and transaction revenue.",
        publicAvailability: "Partial"
      },
      {
        name: zh ? "Take Rate" : "Take rate",
        whyItMatters: zh
          ? "Take Rate 决定平台活动量能转化成多少确认收入。"
          : "Take rate converts platform activity into recognized revenue.",
        publicAvailability: "Unavailable"
      },
      {
        name: zh ? "活跃买家" : "Active buyers",
        whyItMatters: zh
          ? "买家规模决定商家需求强度和长期广告库存价值。"
          : "Buyer scale determines merchant demand and long-run ad inventory value.",
        publicAvailability: "Partial"
      },
      {
        name: zh ? "商家广告 ROI" : "Merchant ad ROI",
        whyItMatters: zh
          ? "如果 ROI 变差，广告预算通常会早于 GMV 明显放缓而先收缩。"
          : "If ROI weakens, ad budgets compress before GMV visibly slows.",
        publicAvailability: "Unavailable"
      },
      {
        name: zh ? "营业利润率" : "Operating margin",
        whyItMatters: zh
          ? "利润率可以看出变现能力是否跑赢补贴和再投资压力。"
          : "Margin shows whether monetization is outrunning traffic subsidy and reinvestment.",
        publicAvailability: "Available"
      }
    ],
    competitorBenchmark: competitorRows,
    risks: {
      facts: zh
        ? ["如果 CAC 上升速度快于单个新增用户带来的毛利，增长逻辑会被破坏。", "如果公司必须依赖补贴守住份额，利润率会受压。"]
        : [
            "Growth breaks if CAC rises faster than gross profit per incremental user.",
            "Margin compresses if the company must rely on subsidies to hold share."
          ],
      assumptions: zh
        ? ["监管和宏观风险因地区而异，适合在 live mode 下补充。"]
        : ["Regulatory and macro risks depend on jurisdiction and should be added in live mode."]
    },
    analystView: {
      mostImportantMetric: zh ? "每个活跃买家的商家变现效率" : "Merchant monetization per active buyer",
      biggestUncertainty: zh ? "变现提升究竟是结构性改善还是补贴驱动" : "Whether monetization gains are structural or subsidy-driven",
      managementQuestion: zh ? "最近的收入增长中，有多少来自 ROI 工具改善，而不是更高广告负载？" : "How much of recent revenue growth came from better ROI tools versus higher ad load?"
    },
    valuation: buildMockValuation(assumptions),
    strategicDiagnosis: {
      currentGrowthDriver: zh ? "在现有流量基础上提升变现效率" : "Monetization expansion on top of existing traffic",
      keyMetric: zh ? "GMV 到收入的转化效率" : "GMV to revenue conversion efficiency",
      bottleneck: zh ? "新增用户质量和上升的获客成本" : "Incremental user quality and rising acquisition cost",
      managementFocus: zh ? "在提升商家 ROI 的同时稳住复购行为" : "Protect repeat purchase behavior while lifting merchant ROI",
      interviewAngle: zh
        ? "面试里真正值得讲的不是单纯用户增长，而是平台能否在不伤害商家回报的前提下继续提升变现。"
        : "The economic question is not just user growth. It is whether the platform can compound monetization without damaging merchant returns.",
      verificationNeeds: zh
        ? ["最近分部披露", "平台 Take Rate 趋势", "营销费用占收入比"]
        : [
            "Recent segment disclosures",
            "Marketplace take rate trend",
            "Marketing expense as a percentage of revenue"
          ]
    },
    sources: [{ title: "Mock mode placeholder", url: "https://example.com/mock-mode", publisher: "Local" }],
    financialSnapshot: {
      marketCap: 145_000_000_000,
      revenue: 36_000_000_000,
      operatingMargin: 0.16,
      freeCashFlow: 4_500_000_000,
      netCashOrDebt: 4_000_000_000,
      dilutedShares: 1_850_000_000,
      fiscalYear: "2025",
      revenueHistory: [
        { year: 2022, revenue: 18_000_000_000 },
        { year: 2023, revenue: 24_000_000_000 },
        { year: 2024, revenue: 30_000_000_000 },
        { year: 2025, revenue: 36_000_000_000 }
      ]
    }
  };
}
