export type SourceLink = {
  title: string;
  url: string;
  snippet?: string;
  publisher?: string;
};

export type FactBlock = {
  label: string;
  value: string;
  sourceUrl?: string;
};

export type CompanyOverview = {
  companyName: string;
  ticker: string;
  industry: string;
  coreProducts: string[];
  mainUserGroups: string[];
  revenueSegments: string[];
  summary: string;
  dataSources: SourceLink[];
};

export type BusinessModelSection = {
  facts: string[];
  assumptions: string[];
};

export type KpiItem = {
  name: string;
  whyItMatters: string;
  publicAvailability: "Available" | "Partial" | "Unavailable";
};

export type CompetitorRow = {
  company: string;
  coreBusiness: string;
  userBase: string;
  revenueModel: string;
  monetizationMethod: string;
  competitiveAdvantage: string;
  weakness: string;
  keyRisk: string;
  metricToWatch: string;
};

export type AssumptionSet = {
  revenueGrowth: number;
  operatingMargin: number;
  discountRate: number;
  terminalGrowth: number;
  userGrowth: number;
  arpuGrowth: number;
  takeRateChange: number;
  marketingExpenseRatio: number;
};

export type ValuationSeriesPoint = {
  year: number;
  revenue: number;
  operatingIncome: number;
  freeCashFlow: number;
};

export type SensitivityCell = {
  x: number;
  y: number;
  value: number;
};

export type ValuationOutput = {
  currency: string;
  equityValue: number;
  enterpriseValue: number;
  valuePerShare: number | null;
  forecast: ValuationSeriesPoint[];
  sensitivity: SensitivityCell[];
};

export type StrategicDiagnosis = {
  currentGrowthDriver: string;
  keyMetric: string;
  bottleneck: string;
  managementFocus: string;
  interviewAngle: string;
  verificationNeeds: string[];
};

export type FinancialSnapshot = {
  marketCap?: number;
  revenue?: number;
  grossMargin?: number;
  operatingMargin?: number;
  freeCashFlow?: number;
  netCashOrDebt?: number;
  dilutedShares?: number;
  fiscalYear?: string;
  revenueHistory?: Array<{ year: number; revenue: number }>;
};

export type CompanyAnalysis = {
  generatedAt: string;
  mode: "mock" | "live";
  businessModelType: string;
  overview: CompanyOverview;
  user: BusinessModelSection;
  useCase: BusinessModelSection;
  product: BusinessModelSection;
  revenue: BusinessModelSection;
  cost: BusinessModelSection;
  growth: BusinessModelSection;
  competition: BusinessModelSection;
  kpis: KpiItem[];
  competitorBenchmark: CompetitorRow[];
  risks: BusinessModelSection;
  analystView: {
    mostImportantMetric: string;
    biggestUncertainty: string;
    managementQuestion: string;
  };
  valuation: ValuationOutput;
  strategicDiagnosis: StrategicDiagnosis;
  sources: SourceLink[];
  financialSnapshot: FinancialSnapshot;
};
