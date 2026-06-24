import { Locale } from "@/components/language-provider";

type CopyShape = {
  common: {
    backHome: string;
    facts: string;
    assumptions: string;
    sourceList: string;
    needsVerification: string;
    mock: string;
    live: string;
    apply: string;
    applied: string;
    dataModeMockTitle: string;
    dataModeMockBody: string;
    dataModeLiveTitle: string;
    dataModeLiveBody: string;
  };
  home: {
    badge: string;
    title: string;
    intro: string;
    tryLabel: string;
    cards: [string, string, string];
    cardBodies: [string, string, string];
    methodologyTitle: string;
    methodologyBody: string;
    methodologyCta: string;
  };
  search: {
    placeholder: string;
    button: string;
  };
  methodology: {
    title: string;
    intro: string;
    sections: Array<{ title: string; text: string }>;
  };
  designRationale: {
    badge: string;
    title: string;
    intro: string;
    decisionLabel: string;
    whyLabel: string;
    rejectedLabel: string;
    decisions: Array<{ decision: string; why: string; rejected: string }>;
    closingTitle: string;
    closingBody: string;
  };
  company: {
    dashboardTitle: string;
    subtitle: string;
    verdictTitle: string;
    verdictSubtitle: string;
    currentPriceLabel: string;
    modelValueLabel: string;
    upsideLabel: string;
    downsideLabel: string;
    impliedGrowthLabel: string;
    verdictLabels: Record<"undervalued" | "fair" | "overvalued" | "unknown", string>;
    verdictNarrative: (args: { gap: string; impliedGrowth: string; baseGrowth: string }) => string;
    verdictNoPrice: string;
    competitors: string;
    competitorsPlaceholder: string;
    competitorsHint: string;
    loading: string;
    users: string;
    products: string;
    revenue: string;
    financialSnapshot: string;
    marketCap: string;
    revenueLabel: string;
    freeCashFlow: string;
    netCashDebt: string;
    dilutedShares: string;
    kpiTitle: string;
    kpiHeaders: [string, string, string];
    competitorTitle: string;
    competitorHeaders: string[];
    valuationTitle: string;
    valuationHeaders: [string, string, string];
    forecastHeaders: [string, string, string, string];
    sensitivityTitle: string;
    sensitivityBody: string;
    analystView: string;
    analystMetric: string;
    analystUncertainty: string;
    analystQuestion: string;
    diagnosisTitle: string;
    currentGrowthDriver: string;
    keyMetric: string;
    growthBottleneck: string;
    managementFocus: string;
    sectionTitles: [string, string, string, string, string, string, string, string];
    availabilityMap: Record<"Available" | "Partial" | "Unavailable", string>;
  };
};

const copy: Record<Locale, CopyShape> = {
  en: {
    common: {
      backHome: "Back Home",
      facts: "Observed Facts",
      assumptions: "Analyst Assumptions",
      sourceList: "Source List",
      needsVerification: "Items still needing verification",
      mock: "mock",
      live: "live",
      apply: "Apply",
      applied: "Applied",
      dataModeMockTitle: "Demo data",
      dataModeMockBody:
        "No live API keys are configured, so the numbers below are illustrative defaults — not the real filings.",
      dataModeLiveTitle: "Live, search-backed",
      dataModeLiveBody:
        "Qualitative analysis is generated from live web sources. The valuation is a simplified DCF, not investment advice."
    },
    home: {
      badge: "Internet business analysis platform",
      title: "Internet Business Analysis Copilot",
      intro:
        "Analyze internet companies the way an operator or investor actually would: reason through users, use cases, monetization, KPI formulas, competition, and a valuation that ends in an actual call — not a generic summary.",
      tryLabel: "Try: PDD, BABA, UBER, NFLX, SPOT, DASH",
      cards: ["Business model", "Competition", "Valuation"],
      cardBodies: [
        "Breaks revenue into the true economic drivers: users, ARPU, GMV, take rate, ad load, frequency, and retention.",
        "Benchmarks the company against peers on monetization structure, moat, weakness, and the one metric worth monitoring.",
        "Links the narrative to an operating model so growth, margin, and strategic bottlenecks can be judged in one frame."
      ],
      methodologyTitle: "Methodology",
      methodologyBody:
        "Qualitative analysis is generated live from web sources with URLs. Annual revenue is pulled straight from SEC EDGAR filings, and the valuation is a transparent, simplified DCF — facts and assumptions stay clearly separated.",
      methodologyCta: "How it works"
    },
    search: {
      placeholder: "Enter ticker or company, e.g. PDD, UBER, NFLX",
      button: "Analyze"
    },
    methodology: {
      title: "Methodology",
      intro:
        "This product is designed for business analysis, so the output is organized around the company's economic engine rather than a generic summary.",
      sections: [
        {
          title: "User",
          text: "Start with the real customer. Consumer internet platforms usually have at least two economic actors, such as users and merchants."
        },
        {
          title: "Revenue engine",
          text: "Map revenue to the formula that actually drives it: GMV x take rate, paid users x ARPU, or active users x time spent x ad load x CPM."
        },
        {
          title: "KPI discipline",
          text: "The dashboard distinguishes metrics disclosed publicly from metrics that still require assumptions."
        },
        {
          title: "Strategic diagnosis",
          text: "The final output asks what could break the growth story instead of stopping at a descriptive company overview."
        },
        {
          title: "Data sources",
          text: "Qualitative analysis comes from live web search plus an LLM, with source URLs. Annual revenue is read directly from SEC EDGAR XBRL filings; market cap is extracted from sources. The valuation is a transparent, simplified DCF, not investment advice."
        }
      ]
    },
    designRationale: {
      badge: "How it works",
      title: "The analytical approach",
      intro:
        "Most AI tools hand you a fluent summary. This one is opinionated on purpose: every section reflects a deliberate choice about what matters, what to trust, and when to stay silent. Here is each principle, the reasoning behind it, and the easier approach it deliberately avoids.",
      decisionLabel: "Principle",
      whyLabel: "Why",
      rejectedLabel: "Why not the alternative",
      decisions: [
        {
          decision:
            "Every company runs through a causal chain — users → monetization → KPIs → competition → valuation → diagnosis — not a free-form summary.",
          why: "The value of analysis is causation and judgment, not a tidy description. A frame that can answer 'what would break the growth story' is worth far more than a perfect company encyclopedia entry.",
          rejected:
            "A polished AI overview. It reads well but contains no falsifiable judgment — a pretty deck, not analysis."
        },
        {
          decision: "Every dimension separates observed facts from analyst assumptions.",
          why: "The most common analytical error is presenting an assumption as a fact. The split forces a clear line between what is known and what is being inferred — and the judgment lives in the assumptions column.",
          rejected:
            "A single blended narrative. The reader can't gauge confidence or challenge any specific claim."
        },
        {
          decision:
            "Revenue is decomposed into unit economics — GMV × take rate, paid users × ARPU, active users × time × ad load × CPM — not a single growth number.",
          why: "The same 20% revenue growth means very different things if it comes from price, volume, or monetization. Only by breaking it into drivers can you judge the quality and durability of growth.",
          rejected:
            "Tracking headline 'revenue growth' alone. It hides whether growth is structural or borrowed."
        },
        {
          decision:
            "Valuation is a reverse-DCF: rather than a price target, it shows the growth the current market cap implies, so you can take a side.",
          why: "Any point valuation is hostage to its assumptions. The useful question is 'what is the market paying for?' — which reframes the call as 'more or less optimistic than the market, and why.'",
          rejected:
            "A single precise target price. That is false precision dressed up as rigor."
        },
        {
          decision:
            "When the data isn't reliable, the tool says 'insufficient data' instead of fabricating an over/undervalued call.",
          why: "Knowing the limits of an analysis matters. A tool that stays quiet when it isn't sure is more trustworthy than one that is always confident.",
          rejected:
            "Always returning a verdict. A confidently wrong call destroys credibility faster than an honest 'not enough data.'"
        },
        {
          decision:
            "Each input takes its most reliable source: revenue from SEC EDGAR filings, qualitative analysis from live search, and the call compares equity value to market cap rather than price-per-share.",
          why: "LLM-extracted revenue proved unreliable (quarter vs. year, currency mix-ups), while per-share price and share counts hit a share-class trap for ADRs. So each number takes its most trustworthy path, and the comparison sidesteps the fragile data entirely.",
          rejected:
            "Trusting one source — or the LLM — for everything and hoping the numbers line up."
        }
      ],
      closingTitle: "Scope and limits",
      closingBody:
        "This is a decision-support tool, not investment advice. Its job is not to hand you a verdict, but to enforce a structured, falsifiable, and honest read of a business — and to be explicit wherever the underlying data is uncertain."
    },
    company: {
      dashboardTitle: "Analysis Dashboard",
      subtitle:
        "This dashboard decomposes the company into user, product, revenue engine, KPI stack, valuation sensitivity, and strategic risks.",
      verdictTitle: "The Call",
      verdictSubtitle: "Where the simplified DCF equity value lands versus the company's market cap.",
      currentPriceLabel: "Market cap",
      modelValueLabel: "Model equity value",
      upsideLabel: "Implied upside",
      downsideLabel: "Implied downside",
      impliedGrowthLabel: "Market-implied growth",
      verdictLabels: {
        undervalued: "Model says UNDERVALUED",
        fair: "Roughly FAIRLY VALUED",
        overvalued: "Model says OVERVALUED",
        unknown: "Insufficient data"
      },
      verdictNarrative: ({ gap, impliedGrowth, baseGrowth }) =>
        `Under your assumptions the model lands ${gap} versus the market. To justify today's price the market is betting on ~${impliedGrowth} revenue growth, against the ${baseGrowth} you set — the gap between those two numbers is the real debate.`,
      verdictNoPrice:
        "Not enough reliable financial data (price or annual revenue) was found to make a valuation call. The qualitative analysis below still holds.",
      competitors: "Optional competitors",
      competitorsPlaceholder: "e.g. BABA, JD",
      competitorsHint:
        "Enter one or two peer tickers, separated by commas, then click Apply. This only updates the competitor benchmark and does not switch the main company.",
      loading: "Running business analysis, KPI decomposition, and valuation model...",
      users: "Users",
      products: "Products",
      revenue: "Revenue",
      financialSnapshot: "Financial snapshot",
      marketCap: "Market cap",
      revenueLabel: "Revenue",
      freeCashFlow: "Free cash flow",
      netCashDebt: "Net cash / debt",
      dilutedShares: "Diluted shares",
      kpiTitle: "8. KPI Decomposition",
      kpiHeaders: ["KPI", "Why it matters", "Disclosure status"],
      competitorTitle: "Competitor Benchmark",
      competitorHeaders: [
        "Company",
        "Core business",
        "Users",
        "Revenue model",
        "Monetization",
        "Advantage",
        "Weakness",
        "Risk",
        "Key metric"
      ],
      valuationTitle: "Valuation & Sensitivity",
      valuationHeaders: ["Enterprise value", "Equity value", "Value per share"],
      forecastHeaders: ["Year", "Revenue", "Operating income", "Free cash flow"],
      sensitivityTitle: "Sensitivity Grid",
      sensitivityBody: "Columns are revenue growth scenarios. Rows are operating margin scenarios.",
      analystView: "10. Analyst View",
      analystMetric: "Metric to monitor",
      analystUncertainty: "Biggest uncertainty",
      analystQuestion: "Question for management",
      diagnosisTitle: "AI Strategic Diagnosis",
      currentGrowthDriver: "Current growth driver",
      keyMetric: "Key metric",
      growthBottleneck: "Growth bottleneck",
      managementFocus: "Management focus",
      sectionTitles: [
        "1. User",
        "2. Use Case",
        "3. Product",
        "4. Revenue",
        "5. Cost",
        "6. Growth",
        "7. Competition",
        "9. Risk"
      ],
      availabilityMap: {
        Available: "Available",
        Partial: "Partially disclosed",
        Unavailable: "Not publicly disclosed"
      }
    }
  },
  zh: {
    common: {
      backHome: "返回首页",
      facts: "已确认事实",
      assumptions: "待验证判断",
      sourceList: "来源列表",
      needsVerification: "后续还要核实的数据点",
      mock: "模拟",
      live: "实时",
      apply: "应用竞对",
      applied: "已应用",
      dataModeMockTitle: "演示数据",
      dataModeMockBody:
        "当前未配置实时 API key，下面的数字是示意默认值，不代表真实财报。",
      dataModeLiveTitle: "实时 · 来源支撑",
      dataModeLiveBody:
        "定性分析基于实时网络来源生成；估值是简化 DCF，不构成投资建议。"
    },
    home: {
      badge: "互联网商业分析平台",
      title: "互联网商业分析 Copilot",
      intro:
        "像真正的从业者或投资人那样分析互联网公司：把用户、需求、变现、KPI 公式、竞争一路推下来，最后落到一个明确判断——而不是又一份泛泛的公司介绍。",
      tryLabel: "可尝试：PDD、BABA、UBER、NFLX、SPOT、DASH",
      cards: ["商业模式", "竞争格局", "估值框架"],
      cardBodies: [
        "把收入拆回真实驱动因子：用户数、ARPU、GMV、Take Rate、广告负载、频次和留存。",
        "把公司和竞对放到同一张表里比较：变现结构、护城河、弱点，以及最值得盯的经营指标。",
        "把业务叙事和经营模型连起来，帮助判断增长、利润率和战略瓶颈是否匹配。"
      ],
      methodologyTitle: "方法框架",
      methodologyBody:
        "定性分析基于实时网络来源生成并保留来源 URL；年度收入直接取自 SEC EDGAR 官方财报；估值是透明的简化 DCF。事实与判断始终分开展示。",
      methodologyCta: "工作原理"
    },
    search: {
      placeholder: "输入股票代码或公司名，例如 PDD、UBER、NFLX",
      button: "开始分析"
    },
    methodology: {
      title: "方法框架",
      intro:
        "这个产品面向商业分析 / 投研判断场景，所以核心不是泛泛公司介绍，而是把公司的经济引擎拆开讲清楚。",
      sections: [
        {
          title: "用户",
          text: "先找真正的客户。很多消费互联网平台至少有两个经济主体，例如消费者和商家。"
        },
        {
          title: "收入引擎",
          text: "把收入映射到真正的公式上：GMV × Take Rate、付费用户 × ARPU，或活跃用户 × 使用时长 × 广告负载 × CPM。"
        },
        {
          title: "KPI 纪律",
          text: "页面会区分哪些指标有公开披露，哪些指标只能依赖假设。"
        },
        {
          title: "战略诊断",
          text: "最终输出不是停留在公司概述，而是追问什么因素会破坏增长逻辑。"
        },
        {
          title: "数据来源",
          text: "定性分析来自实时网络搜索加大模型，并保留来源 URL；年度收入直接读取 SEC EDGAR 财报 XBRL；市值由来源抽取。估值是透明的简化 DCF，不构成投资建议。"
        }
      ]
    },
    designRationale: {
      badge: "工作原理",
      title: "分析方法",
      intro:
        "多数 AI 工具给你一段流畅的总结，这个产品刻意带着观点：每一处都是一个有意识的取舍——什么重要、什么能信、什么时候该闭嘴。下面是每条原则、背后的理由，以及它刻意避开的那个更省事的做法。",
      decisionLabel: "原则",
      whyLabel: "为什么",
      rejectedLabel: "为什么不那样做",
      decisions: [
        {
          decision:
            "每家公司都走一条因果链——用户 → 变现 → KPI → 竞争 → 估值 → 诊断，而不是自由发挥的总结。",
          why: "分析的价值在于因果和判断，不在于一段漂亮的描述。一个能回答“增长会被什么打断”的框架，远比一条完美的公司百科词条有用。",
          rejected:
            "一段打磨过的 AI 综述。它读起来很顺，但没有任何可证伪的判断——那是漂亮的 PPT，不是分析。"
        },
        {
          decision: "每个维度都把“已确认事实”和“待验证假设”分两栏。",
          why: "最常见的分析错误，就是把假设当事实讲。强制分栏，等于在“已知”和“推断”之间划一条清晰的线——而判断恰恰体现在假设那一栏。",
          rejected:
            "把所有结论混成一段叙述。读者无法分辨可信度，也无法针对某一条来挑战。"
        },
        {
          decision:
            "把收入拆成单位经济学——GMV×Take Rate、付费用户×ARPU、活跃×时长×广告负载×CPM，而不是只看一个增长数字。",
          why: "同样 20% 的收入增长，来自涨价、涨量还是涨变现率，故事和可持续性完全不同。只有拆到驱动因子，才能判断增长的质量。",
          rejected:
            "只盯“收入增速”这个表层指标。它掩盖了增长到底是结构性的，还是借来的。"
        },
        {
          decision:
            "估值用反推：不给目标价，而是算出当前市值隐含了多少增速，让你来表态。",
          why: "任何点估值都被它的假设绑架，单看没意义。真正有用的问题是“市场在为什么买单”——这把判断从“我猜多少”变成“我比市场更乐观还是更悲观、为什么”。",
          rejected:
            "一个看似精确的目标价。那是把伪精确伪装成严谨。"
        },
        {
          decision: "数据不可靠时，工具显示“数据不足”，而不是硬编一个高估/低估结论。",
          why: "知道一份分析的边界很重要。一个没把握时会闭嘴的工具，比一个永远自信的工具更可信。",
          rejected:
            "无论如何都给个结论。一个自信的错误结论，比一句诚实的“数据不够”更快毁掉可信度。"
        },
        {
          decision:
            "每个数据走它最可靠的来源：收入取自 SEC EDGAR 官方财报，定性分析靠实时搜索，结论比“股权价值 vs 市值”而非每股。",
          why: "实测发现 LLM 抽收入不可靠（季度当年度、币种混淆），而每股股价/股数对中概 ADR 又有股本换算陷阱。所以让每个数字走最可信的路径，并用一个绕开脆弱数据的比较口径。",
          rejected:
            "全靠一个数据源、或全靠 LLM 的省事做法，然后祈祷数字能对上。"
        }
      ],
      closingTitle: "适用范围与边界",
      closingBody:
        "这是一个辅助决策工具，不构成投资建议。它的职责不是直接给你一个结论，而是强制一套结构化、可证伪、诚实的公司解读——并在底层数据不确定的地方明确标注出来。"
    },
    company: {
      dashboardTitle: "分析面板",
      subtitle: "这个面板把公司拆成用户、产品、收入引擎、KPI 体系、估值敏感性和战略风险。",
      verdictTitle: "结论",
      verdictSubtitle: "简化 DCF 算出的股权价值，相对公司市值落在哪里。",
      currentPriceLabel: "市值",
      modelValueLabel: "模型股权价值",
      upsideLabel: "隐含上行空间",
      downsideLabel: "隐含下行空间",
      impliedGrowthLabel: "市场隐含增速",
      verdictLabels: {
        undervalued: "模型判断：低估",
        fair: "大致：合理估值",
        overvalued: "模型判断：高估",
        unknown: "数据不足"
      },
      verdictNarrative: ({ gap, impliedGrowth, baseGrowth }) =>
        `在你设定的假设下，模型相对市价${gap}。要支撑当前股价，市场大约押注 ${impliedGrowth} 的收入增速，而你设的是 ${baseGrowth}——这两个数字之间的差，才是真正要辩论的地方。`,
      verdictNoPrice:
        "没有找到足够可靠的财务数据（股价或年度收入），无法给出估值结论。下面的定性分析依然成立。",
      competitors: "可选竞对",
      competitorsPlaceholder: "例如：BABA, JD",
      competitorsHint:
        "输入 1-2 个竞对代码，用逗号分隔，然后点击“应用竞对”。这个功能只更新竞对对比模块，不会切换当前主分析公司。",
      loading: "正在生成商业分析、KPI 拆解和估值模型...",
      users: "用户",
      products: "产品",
      revenue: "收入结构",
      financialSnapshot: "财务快照",
      marketCap: "市值",
      revenueLabel: "收入",
      freeCashFlow: "自由现金流",
      netCashDebt: "净现金 / 净负债",
      dilutedShares: "摊薄股数",
      kpiTitle: "8. KPI 拆解",
      kpiHeaders: ["KPI", "为什么关键", "公开披露情况"],
      competitorTitle: "竞对对比",
      competitorHeaders: [
        "公司",
        "核心业务",
        "用户基础",
        "收入模式",
        "变现方式",
        "优势",
        "弱点",
        "主要风险",
        "重点指标"
      ],
      valuationTitle: "估值与敏感性",
      valuationHeaders: ["企业价值", "股权价值", "每股价值"],
      forecastHeaders: ["年份", "收入", "营业利润", "自由现金流"],
      sensitivityTitle: "敏感性矩阵",
      sensitivityBody: "列表示收入增速情景，行表示营业利润率情景。",
      analystView: "10. 分析师观点",
      analystMetric: "最值得盯的指标",
      analystUncertainty: "最大的判断不确定性",
      analystQuestion: "最应该追问管理层的问题",
      diagnosisTitle: "AI 战略诊断",
      currentGrowthDriver: "当前增长驱动",
      keyMetric: "关键经营指标",
      growthBottleneck: "增长瓶颈",
      managementFocus: "管理层当前重点",
      sectionTitles: [
        "1. 用户",
        "2. 使用场景",
        "3. 产品与入口",
        "4. 收入机制",
        "5. 成本结构",
        "6. 增长引擎",
        "7. 竞争格局",
        "9. 风险点"
      ],
      availabilityMap: {
        Available: "有公开披露",
        Partial: "只有部分披露",
        Unavailable: "公开资料中缺失"
      }
    }
  }
};

export function getCopy(locale: Locale) {
  return copy[locale];
}
