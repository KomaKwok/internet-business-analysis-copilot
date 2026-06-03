"use client";

import { useLanguage } from "@/components/language-provider";
import { buildValuation } from "@/lib/analysis/valuation";
import { getCopy } from "@/lib/copy";
import { AssumptionSet, CompanyAnalysis, CompetitorRow, FinancialSnapshot } from "@/lib/types";
import { cn, formatCompactNumber, formatMoney } from "@/lib/utils";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Props = {
  query: string;
};

const initialAssumptions: AssumptionSet = {
  revenueGrowth: 0.18,
  operatingMargin: 0.16,
  discountRate: 0.1,
  terminalGrowth: 0.03,
  userGrowth: 0.12,
  arpuGrowth: 0.05,
  takeRateChange: 0.01,
  marketingExpenseRatio: 0.18
};

function SectionTitle({ title }: { title: string }) {
  const [index, ...rest] = title.split(".");
  const body = rest.join(".").trim() || title;

  return (
    <div className="mb-5 flex items-end gap-3 border-b border-[#eadfce] pb-3">
      <span className="font-display text-4xl font-bold leading-none text-accent">{index}.</span>
      <h3 className="font-display text-[2rem] font-semibold leading-none text-navy">{body}</h3>
    </div>
  );
}

function PlainTitle({ title }: { title: string }) {
  return (
    <h3 className="mb-5 border-b border-[#eadfce] pb-3 font-display text-[2rem] font-semibold text-navy">
      {title}
    </h3>
  );
}

function SectionCard({
  title,
  facts,
  assumptions,
  factsLabel,
  assumptionsLabel
}: {
  title: string;
  facts: string[];
  assumptions: string[];
  factsLabel: string;
  assumptionsLabel: string;
}) {
  return (
    <section className="rounded-[28px] border border-white/70 bg-panel p-6 shadow-card">
      <SectionTitle title={title} />
      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <p className="mb-3 rounded-2xl bg-[#f5e3d5] px-4 py-3 text-center text-lg font-semibold text-accent">
            {factsLabel}
          </p>
          <ul className="space-y-2 text-sm leading-7 text-ink">
            {facts.map((item) => (
              <li key={item} className="rounded-2xl bg-white px-5 py-4 shadow-sm">
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-3 rounded-2xl bg-[#f8eddc] px-4 py-3 text-center text-lg font-semibold text-accent">
            {assumptionsLabel}
          </p>
          <ul className="space-y-2 text-sm leading-7 text-ink">
            {assumptions.map((item) => (
              <li
                key={item}
                className="rounded-2xl border border-dashed border-[#dfcbb8] bg-[#fffdfa] px-5 py-4"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function RangeInput({
  label,
  value,
  min,
  max,
  step,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block rounded-[24px] border border-white/70 bg-panel p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-base font-medium text-navy">{label}</span>
        <span className="text-2xl font-semibold text-accent">{(value * 100).toFixed(1)}%</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-[#b55233]"
      />
    </label>
  );
}

function getHeatColor(value: number, min: number, max: number) {
  const ratio = max === min ? 0.5 : (value - min) / (max - min);
  const red = Math.round(250 - ratio * 78);
  const green = Math.round(244 - ratio * 100);
  const blue = Math.round(234 - ratio * 132);
  return `rgb(${red}, ${green}, ${blue})`;
}

function buildCompetitorTableRows(baseAnalysis: CompanyAnalysis, competitors: string[]): CompetitorRow[] {
  if (!competitors.length) {
    return baseAnalysis.competitorBenchmark;
  }

  const existing = new Map(
    baseAnalysis.competitorBenchmark.map((row) => [row.company.toUpperCase(), row] as const)
  );

  return competitors.map((name, index) => {
    const hit = existing.get(name.toUpperCase());
    if (hit) {
      return hit;
    }

    return {
      company: name,
      coreBusiness: index === 0 ? "综合平台 / 电商生态" : "平台或零售相关业务",
      userBase: index === 0 ? "大盘消费者与商家" : "高频或细分用户群",
      revenueModel: "广告、佣金、服务费",
      monetizationMethod: "商家投放、抽成、服务收费",
      competitiveAdvantage: "品牌、供给或生态协同",
      weakness: "需要进一步核实",
      keyRisk: "竞争压力或利润率波动",
      metricToWatch: "收入增速 / 变现效率"
    };
  });
}

function SnapshotPanel({
  snapshot,
  locale
}: {
  snapshot: FinancialSnapshot;
  locale: "en" | "zh";
}) {
  const revenueHistory = snapshot.revenueHistory || [];
  const maxRevenue = Math.max(...revenueHistory.map((item) => item.revenue), 1);

  const items = [
    { label: locale === "zh" ? "市值" : "Market cap", value: formatMoney(snapshot.marketCap) },
    { label: locale === "zh" ? "收入" : "Revenue", value: formatMoney(snapshot.revenue) },
    {
      label: locale === "zh" ? "自由现金流" : "Free cash flow",
      value: formatMoney(snapshot.freeCashFlow)
    },
    {
      label: locale === "zh" ? "净现金 / 净负债" : "Net cash / debt",
      value: formatMoney(snapshot.netCashOrDebt)
    },
    {
      label: locale === "zh" ? "摊薄股数" : "Diluted shares",
      value: formatCompactNumber(snapshot.dilutedShares)
    }
  ];

  return (
    <div className="rounded-[28px] border border-white/70 bg-panel p-7 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
        {locale === "zh" ? "财务快照" : "Financial snapshot"}
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.label} className="rounded-2xl bg-white px-4 py-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.12em] text-steel">{item.label}</p>
            <p className="mt-2 break-all text-xl font-semibold text-navy">{item.value}</p>
          </div>
        ))}
      </div>
      {revenueHistory.length ? (
        <div className="mt-6 rounded-2xl bg-[#fffaf3] p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-navy">
              {locale === "zh" ? "历史收入走势" : "Revenue history"}
            </p>
            <p className="text-xs text-steel">
              {locale === "zh" ? "越长代表收入越高" : "Longer bar means higher revenue"}
            </p>
          </div>
          <div className="space-y-3">
            {revenueHistory.map((point) => (
              <div key={point.year} className="grid grid-cols-[56px_1fr_auto] items-center gap-3">
                <span className="text-sm font-medium text-steel">{point.year}</span>
                <div className="h-3 rounded-full bg-[#f2eadf]">
                  <div
                    className="h-3 rounded-full bg-[#b55233]"
                    style={{ width: `${(point.revenue / maxRevenue) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-navy">{formatMoney(point.revenue)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function AnalysisClient({ query }: Props) {
  const { locale } = useLanguage();
  const text = getCopy(locale);
  const [analysis, setAnalysis] = useState<CompanyAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [competitorDraft, setCompetitorDraft] = useState("");
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [assumptions, setAssumptions] = useState<AssumptionSet>(initialAssumptions);

  function handleCompetitorApply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCompetitors(
      competitorDraft
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 2)
    );
  }

  useEffect(() => {
    let active = true;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            locale,
            competitors
          })
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to analyze company.");
        }
        if (active) {
          setAnalysis(data);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void run();
    return () => {
      active = false;
    };
  }, [query, locale, competitors]);

  const valuation = useMemo(() => {
    if (!analysis) {
      return null;
    }
    return buildValuation(analysis.financialSnapshot, assumptions);
  }, [analysis, assumptions]);

  const competitorRows = useMemo(() => {
    if (!analysis) {
      return [];
    }
    return buildCompetitorTableRows(analysis, competitors);
  }, [analysis, competitors]);

  const xValues = useMemo(
    () =>
      valuation
        ? Array.from(new Set(valuation.sensitivity.map((cell) => cell.x))).sort((a, b) => a - b)
        : [],
    [valuation]
  );
  const yValues = useMemo(
    () =>
      valuation
        ? Array.from(new Set(valuation.sensitivity.map((cell) => cell.y))).sort((a, b) => a - b)
        : [],
    [valuation]
  );
  const valueMap = useMemo(
    () =>
      new Map(
        (valuation?.sensitivity || []).map((cell) => [`${cell.y}-${cell.x}`, cell.value] as const)
      ),
    [valuation]
  );
  const sensitivityBounds = useMemo(() => {
    const values = valuation?.sensitivity.map((cell) => cell.value) || [0];
    return { min: Math.min(...values), max: Math.max(...values) };
  }, [valuation]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
      <div className="mb-8 grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-[30px] border border-white/70 bg-panel p-8 shadow-card">
          <Link href="/" className="text-xs font-semibold uppercase tracking-[0.24em] text-steel">
            {text.common.backHome}
          </Link>
          <h1 className="mt-4 font-display text-6xl font-semibold text-navy">
            {query} {text.company.dashboardTitle}
          </h1>
          <p className="mt-3 max-w-3xl text-lg leading-8 text-steel">{text.company.subtitle}</p>
        </div>

        <div className="rounded-[30px] border border-white/70 bg-panel p-6 shadow-card">
          <form onSubmit={handleCompetitorApply} className="space-y-3">
            <p className="text-sm font-semibold tracking-[0.08em] text-accent">
              {text.company.competitors}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={competitorDraft}
                onChange={(event) => setCompetitorDraft(event.target.value)}
                placeholder={text.company.competitorsPlaceholder}
                className="w-full rounded-2xl border border-[#d8dfe8] bg-white px-5 py-4 text-sm outline-none"
              />
              <button
                type="submit"
                className="rounded-2xl bg-accent px-5 py-4 text-sm font-semibold text-white"
              >
                {text.common.apply}
              </button>
            </div>
            <p className="text-sm leading-6 text-steel">{text.company.competitorsHint}</p>
            {competitors.length ? (
              <p className="text-sm font-medium text-navy">
                {text.common.applied}: {competitors.join(", ")}
              </p>
            ) : null}
          </form>
        </div>
      </div>

      {loading ? (
        <div className="rounded-[28px] border border-white/70 bg-panel p-10 text-sm text-steel shadow-card">
          {text.company.loading}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[28px] border border-[#efc7c0] bg-[#fff2ef] p-6 text-sm text-[#8a2e19]">
          {error}
        </div>
      ) : null}

      {!loading && analysis && valuation ? (
        <div className="space-y-8">
          <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="rounded-[28px] border border-white/70 bg-panel p-8 shadow-card">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-[#f2eadf] px-4 py-2 text-sm font-semibold text-navy">
                  {analysis.businessModelType}
                </span>
              </div>
              <h2 className="mt-5 font-display text-5xl font-semibold text-navy">
                {analysis.overview.companyName}
              </h2>
              <p className="mt-4 max-w-4xl text-lg leading-9 text-steel">{analysis.overview.summary}</p>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {[
                  { label: text.company.users, value: analysis.overview.mainUserGroups.join("、") },
                  { label: text.company.products, value: analysis.overview.coreProducts.join("、") },
                  { label: text.company.revenue, value: analysis.overview.revenueSegments.join("、") }
                ].map((item) => (
                  <div key={item.label} className="rounded-[24px] bg-[#fffaf3] p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.12em] text-accent">{item.label}</p>
                    <p className="mt-3 text-[1.05rem] font-semibold leading-8 text-navy">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <SnapshotPanel snapshot={analysis.financialSnapshot} locale={locale} />
          </section>

          <div className="grid gap-8 lg:grid-cols-2">
            <SectionCard
              title={text.company.sectionTitles[0]}
              facts={analysis.user.facts}
              assumptions={analysis.user.assumptions}
              factsLabel={text.common.facts}
              assumptionsLabel={text.common.assumptions}
            />
            <SectionCard
              title={text.company.sectionTitles[1]}
              facts={analysis.useCase.facts}
              assumptions={analysis.useCase.assumptions}
              factsLabel={text.common.facts}
              assumptionsLabel={text.common.assumptions}
            />
            <SectionCard
              title={text.company.sectionTitles[2]}
              facts={analysis.product.facts}
              assumptions={analysis.product.assumptions}
              factsLabel={text.common.facts}
              assumptionsLabel={text.common.assumptions}
            />
            <SectionCard
              title={text.company.sectionTitles[3]}
              facts={analysis.revenue.facts}
              assumptions={analysis.revenue.assumptions}
              factsLabel={text.common.facts}
              assumptionsLabel={text.common.assumptions}
            />
            <SectionCard
              title={text.company.sectionTitles[4]}
              facts={analysis.cost.facts}
              assumptions={analysis.cost.assumptions}
              factsLabel={text.common.facts}
              assumptionsLabel={text.common.assumptions}
            />
            <SectionCard
              title={text.company.sectionTitles[5]}
              facts={analysis.growth.facts}
              assumptions={analysis.growth.assumptions}
              factsLabel={text.common.facts}
              assumptionsLabel={text.common.assumptions}
            />
            <SectionCard
              title={text.company.sectionTitles[6]}
              facts={analysis.competition.facts}
              assumptions={analysis.competition.assumptions}
              factsLabel={text.common.facts}
              assumptionsLabel={text.common.assumptions}
            />
          </div>

          <section className="rounded-[28px] border border-white/70 bg-panel p-7 shadow-card">
            <SectionTitle title={text.company.kpiTitle} />
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="bg-[#efe3d3] text-navy">
                    {text.company.kpiHeaders.map((header) => (
                      <th key={header} className="px-5 py-4 text-base font-semibold first:rounded-l-2xl last:rounded-r-2xl">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {analysis.kpis.map((kpi) => (
                    <tr key={kpi.name} className="border-b border-[#e7dccd] align-top">
                      <td className="px-5 py-5 text-lg font-semibold text-navy">{kpi.name}</td>
                      <td className="px-5 py-5 text-base leading-7 text-steel">{kpi.whyItMatters}</td>
                      <td className="px-5 py-5">
                        <span
                          className={cn(
                            "rounded-full px-4 py-2 text-sm font-semibold",
                            kpi.publicAvailability === "Available" && "bg-[#dbeedc] text-[#295e36]",
                            kpi.publicAvailability === "Partial" && "bg-[#f7e7cf] text-[#8a5a12]",
                            kpi.publicAvailability === "Unavailable" && "bg-[#efe0e7] text-[#7c426a]"
                          )}
                        >
                          {text.company.availabilityMap[kpi.publicAvailability]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-[28px] border border-white/70 bg-panel p-7 shadow-card">
            <SectionTitle title={text.company.sectionTitles[7]} />
            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <p className="mb-3 rounded-2xl bg-[#f5e3d5] px-4 py-3 text-center text-lg font-semibold text-accent">
                  {text.common.facts}
                </p>
                <ul className="space-y-2 text-sm leading-7 text-ink">
                  {analysis.risks.facts.map((item) => (
                    <li key={item} className="rounded-2xl bg-white px-5 py-4 shadow-sm">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-3 rounded-2xl bg-[#f8eddc] px-4 py-3 text-center text-lg font-semibold text-accent">
                  {text.common.assumptions}
                </p>
                <ul className="space-y-2 text-sm leading-7 text-ink">
                  {analysis.risks.assumptions.map((item) => (
                    <li
                      key={item}
                      className="rounded-2xl border border-dashed border-[#dfcbb8] bg-[#fffdfa] px-5 py-4"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-white/70 bg-panel p-7 shadow-card">
            <PlainTitle title={text.company.competitorTitle} />
            <div className="overflow-x-auto">
              <table className="min-w-[1180px] text-left text-sm">
                <thead>
                  <tr className="bg-[#efe3d3] text-navy">
                    {text.company.competitorHeaders.map((header) => (
                      <th
                        key={header}
                        className="whitespace-nowrap px-4 py-4 text-center text-base font-semibold first:rounded-l-2xl last:rounded-r-2xl"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {competitorRows.map((row) => (
                    <tr key={row.company} className="border-b border-[#e7dccd] align-top">
                      <td className="px-4 py-5 text-lg font-semibold text-navy">{row.company}</td>
                      <td className="px-4 py-5 text-base leading-7 text-steel">{row.coreBusiness}</td>
                      <td className="px-4 py-5 text-base leading-7 text-steel">{row.userBase}</td>
                      <td className="px-4 py-5 text-base leading-7 text-steel">{row.revenueModel}</td>
                      <td className="px-4 py-5 text-base leading-7 text-steel">{row.monetizationMethod}</td>
                      <td className="px-4 py-5 text-base leading-7 text-steel">{row.competitiveAdvantage}</td>
                      <td className="px-4 py-5 text-base leading-7 text-steel">{row.weakness}</td>
                      <td className="px-4 py-5 text-base leading-7 text-steel">{row.keyRisk}</td>
                      <td className="px-4 py-5 text-base leading-7 text-steel">{row.metricToWatch}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-8 xl:grid-cols-[1fr_1fr]">
            <div className="rounded-[28px] border border-white/70 bg-panel p-7 shadow-card">
              <SectionTitle title={text.company.valuationTitle} />
              <div className="mb-6 grid gap-4 md:grid-cols-2">
                <RangeInput
                  label="Revenue growth"
                  value={assumptions.revenueGrowth}
                  min={0.02}
                  max={0.4}
                  step={0.01}
                  onChange={(value) => setAssumptions((current) => ({ ...current, revenueGrowth: value }))}
                />
                <RangeInput
                  label="Operating margin"
                  value={assumptions.operatingMargin}
                  min={0.05}
                  max={0.4}
                  step={0.01}
                  onChange={(value) => setAssumptions((current) => ({ ...current, operatingMargin: value }))}
                />
                <RangeInput
                  label="Discount rate"
                  value={assumptions.discountRate}
                  min={0.06}
                  max={0.18}
                  step={0.005}
                  onChange={(value) => setAssumptions((current) => ({ ...current, discountRate: value }))}
                />
                <RangeInput
                  label="Marketing expense ratio"
                  value={assumptions.marketingExpenseRatio}
                  min={0.05}
                  max={0.35}
                  step={0.01}
                  onChange={(value) =>
                    setAssumptions((current) => ({ ...current, marketingExpenseRatio: value }))
                  }
                />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[24px] bg-[#fffaf3] p-5 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.12em] text-steel">{text.company.valuationHeaders[0]}</p>
                  <p className="mt-3 break-all text-2xl font-semibold text-navy">
                    {formatMoney(valuation.enterpriseValue)}
                  </p>
                </div>
                <div className="rounded-[24px] bg-[#fffaf3] p-5 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.12em] text-steel">{text.company.valuationHeaders[1]}</p>
                  <p className="mt-3 break-all text-2xl font-semibold text-navy">
                    {formatMoney(valuation.equityValue)}
                  </p>
                </div>
                <div className="rounded-[24px] border border-[#dfcbb8] bg-[#f5e3d5] p-5 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.12em] text-accent">{text.company.valuationHeaders[2]}</p>
                  <p className="mt-3 break-all text-3xl font-semibold text-accent">
                    {valuation.valuePerShare ? formatMoney(valuation.valuePerShare) : text.common.needsVerification}
                  </p>
                </div>
              </div>
              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="bg-[#efe3d3] text-navy">
                      {text.company.forecastHeaders.map((header) => (
                        <th key={header} className="px-4 py-4 text-base font-semibold first:rounded-l-2xl last:rounded-r-2xl">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {valuation.forecast.map((row) => (
                      <tr key={row.year} className="border-b border-[#e7dccd]">
                        <td className="px-4 py-4 text-lg font-semibold text-navy">{row.year}</td>
                        <td className="px-4 py-4 text-base text-steel">{formatMoney(row.revenue)}</td>
                        <td className="px-4 py-4 text-base text-steel">{formatMoney(row.operatingIncome)}</td>
                        <td className="px-4 py-4 text-base text-steel">{formatMoney(row.freeCashFlow)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/70 bg-panel p-7 shadow-card">
              <SectionTitle title={text.company.sensitivityTitle} />
              <p className="mb-5 text-base leading-7 text-steel">{text.company.sensitivityBody}</p>
              <div className="rounded-[24px] border border-[#eadfce] bg-[#fffaf3] p-4">
                <div className="mb-4 flex items-center justify-between text-sm font-semibold text-steel">
                  <span>{locale === "zh" ? "X 轴：收入增速" : "X Axis: Revenue growth"}</span>
                  <span>{locale === "zh" ? "Y 轴：营业利润率" : "Y Axis: Operating margin"}</span>
                </div>
                <div className="overflow-x-auto">
                  <div
                    className="grid min-w-[600px] gap-3"
                    style={{ gridTemplateColumns: `104px repeat(${xValues.length}, minmax(0, 1fr))` }}
                  >
                    <div className="flex items-center justify-center rounded-2xl bg-[#f6ecdf] px-3 py-4 text-center text-sm font-semibold text-navy">
                      Margin \ Growth
                    </div>
                    {xValues.map((x) => (
                      <div
                        key={`head-${x}`}
                        className="rounded-2xl bg-[#efe3d3] px-3 py-4 text-center text-lg font-semibold text-navy"
                      >
                        {x}%
                      </div>
                    ))}

                    {yValues.map((y) => (
                      <>
                        <div
                          key={`row-${y}`}
                          className="flex items-center justify-center rounded-2xl bg-[#f6ecdf] px-3 py-4 text-center text-lg font-semibold text-navy"
                        >
                          {y}%
                        </div>
                        {xValues.map((x) => {
                          const value = valueMap.get(`${y}-${x}`) ?? 0;
                          const isBaseCase =
                            x === Number((assumptions.revenueGrowth * 100).toFixed(1)) &&
                            y === Number((assumptions.operatingMargin * 100).toFixed(1));

                          return (
                            <div
                              key={`${y}-${x}`}
                              className={cn(
                                "rounded-2xl border p-4",
                                isBaseCase ? "border-[#b55233] ring-2 ring-[#e6b7a6]" : "border-white/70"
                              )}
                              style={{
                                backgroundColor: getHeatColor(
                                  value,
                                  sensitivityBounds.min,
                                  sensitivityBounds.max
                                )
                              }}
                            >
                              <p className="text-xs font-medium text-navy/75">
                                {isBaseCase ? (locale === "zh" ? "当前假设" : "Base case") : `${x}% / ${y}%`}
                              </p>
                              <p className="mt-3 text-2xl font-semibold text-navy">
                                {formatMoney(value)}
                              </p>
                            </div>
                          );
                        })}
                      </>
                    ))}
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-sm text-steel">{locale === "zh" ? "保守" : "Conservative"}</p>
                  <div className="h-3 flex-1 rounded-full bg-gradient-to-r from-[#f8f4ed] via-[#e8c8a8] to-[#8d4c2f]" />
                  <p className="text-sm text-steel">{locale === "zh" ? "乐观" : "Bullish"}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[28px] border border-white/70 bg-panel p-7 shadow-card">
              <SectionTitle title={text.company.analystView} />
              <div className="grid gap-4">
                {[
                  { label: text.company.analystMetric, value: analysis.analystView.mostImportantMetric },
                  {
                    label: text.company.analystUncertainty,
                    value: analysis.analystView.biggestUncertainty
                  },
                  {
                    label: text.company.analystQuestion,
                    value: analysis.analystView.managementQuestion
                  }
                ].map((item) => (
                  <div key={item.label} className="rounded-[22px] bg-[#fffaf3] p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.12em] text-accent">{item.label}</p>
                    <p className="mt-3 text-lg font-semibold leading-8 text-navy">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/70 bg-panel p-7 shadow-card">
              <SectionTitle title={text.company.diagnosisTitle} />
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  {
                    label: text.company.currentGrowthDriver,
                    value: analysis.strategicDiagnosis.currentGrowthDriver
                  },
                  { label: text.company.keyMetric, value: analysis.strategicDiagnosis.keyMetric },
                  {
                    label: text.company.growthBottleneck,
                    value: analysis.strategicDiagnosis.bottleneck
                  },
                  {
                    label: text.company.managementFocus,
                    value: analysis.strategicDiagnosis.managementFocus
                  }
                ].map((item) => (
                  <div key={item.label} className="rounded-[22px] bg-[#fffaf3] p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.12em] text-accent">{item.label}</p>
                    <p className="mt-3 text-base leading-7 text-navy">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-[22px] border border-dashed border-[#dfcbb8] bg-[#fffdfa] p-5 text-base leading-8 text-navy">
                {analysis.strategicDiagnosis.interviewAngle}
              </div>
              <div className="mt-4 rounded-[22px] bg-[#fffaf3] p-5">
                <p className="text-xs uppercase tracking-[0.12em] text-accent">
                  {text.common.needsVerification}
                </p>
                <div className="mt-3 grid gap-3">
                  {analysis.strategicDiagnosis.verificationNeeds.map((item) => (
                    <div key={item} className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-white/70 bg-panel p-7 shadow-card">
            <h3 className="font-display text-3xl font-semibold text-navy">{text.common.sourceList}</h3>
            <div className="mt-5 grid gap-3">
              {analysis.sources.map((source) => (
                <a
                  key={source.url}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-[22px] border border-[#ece3d7] bg-[#fffaf3] p-5 transition hover:border-accent"
                >
                  <p className="text-lg font-semibold text-navy">{source.title}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.12em] text-steel">
                    {source.publisher || "Unknown"}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-steel">{source.snippet || source.url}</p>
                </a>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
