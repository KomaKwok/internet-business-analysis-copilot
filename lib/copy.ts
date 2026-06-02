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
  company: {
    dashboardTitle: string;
    subtitle: string;
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
      applied: "Applied"
    },
    home: {
      badge: "Portfolio project",
      title: "Internet Business Analysis Copilot",
      intro:
        "Analyze internet companies through the operating logic that actually matters: users, use cases, monetization, KPI formulas, competitive pressure, valuation sensitivity, and management questions.",
      tryLabel: "Try: PDD, BABA, UBER, NFLX, SPOT, DASH",
      cards: ["Business model", "Competition", "Valuation"],
      cardBodies: [
        "Breaks revenue into the true economic drivers: users, ARPU, GMV, take rate, ad load, frequency, and retention.",
        "Benchmarks the company against peers on monetization structure, moat, weakness, and the one metric worth monitoring.",
        "Links the narrative to a live operating model so you can talk about growth, margin, and strategic bottlenecks in one frame."
      ],
      methodologyTitle: "Methodology",
      methodologyBody:
        "Facts and assumptions are separated. Search-backed claims keep source URLs. Missing numbers are explicitly flagged for follow-up verification.",
      methodologyCta: "View method"
    },
    search: {
      placeholder: "Enter ticker or company, e.g. PDD, UBER, NFLX",
      button: "Analyze"
    },
    methodology: {
      title: "Methodology",
      intro:
        "This product is designed for analyst interviews, so the analysis is organized around the company's economic engine rather than a generic summary.",
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
        }
      ]
    },
    company: {
      dashboardTitle: "Analysis Dashboard",
      subtitle:
        "This dashboard decomposes the company into user, product, revenue engine, KPI stack, valuation sensitivity, and strategic risks.",
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
      applied: "已应用"
    },
    home: {
      badge: "作品集项目",
      title: "互联网商业分析 Copilot",
      intro:
        "用真正决定结果的经营逻辑来分析互联网公司：用户是谁、需求是什么、怎么变现、关键 KPI 怎么拆、竞争压力来自哪里，以及估值对哪些经营变量最敏感。",
      tryLabel: "可尝试：PDD、BABA、UBER、NFLX、SPOT、DASH",
      cards: ["商业模式", "竞争格局", "估值框架"],
      cardBodies: [
        "把收入拆回真实驱动因子：用户数、ARPU、GMV、Take Rate、广告负载、频次和留存。",
        "把公司和竞对放到同一张表里比较：变现结构、护城河、弱点，以及最值得盯的经营指标。",
        "把业务叙事和经营模型连起来，方便你在面试里同时讲增长、利润率和战略瓶颈。"
      ],
      methodologyTitle: "方法框架",
      methodologyBody:
        "事实和判断分开展示；搜索得出的结论保留来源 URL；缺失数字不会硬编，而是明确标记为后续需要核实。",
      methodologyCta: "查看方法"
    },
    search: {
      placeholder: "输入股票代码或公司名，例如 PDD、UBER、NFLX",
      button: "开始分析"
    },
    methodology: {
      title: "方法框架",
      intro:
        "这个产品面向商业分析 / 战略分析面试场景，所以核心不是泛泛公司介绍，而是把公司的经济引擎拆开讲清楚。",
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
        }
      ]
    },
    company: {
      dashboardTitle: "分析面板",
      subtitle: "这个面板把公司拆成用户、产品、收入引擎、KPI 体系、估值敏感性和战略风险。",
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
