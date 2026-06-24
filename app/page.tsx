"use client";

import { SearchForm } from "@/components/search-form";
import { useLanguage } from "@/components/language-provider";
import { getCopy } from "@/lib/copy";
import Link from "next/link";

export default function HomePage() {
  const { locale } = useLanguage();
  const text = getCopy(locale);
  const isZh = locale === "zh";

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-10 lg:px-10">
      <div className="rounded-[36px] border border-white/60 bg-white/60 p-8 shadow-card backdrop-blur md:p-12">
        <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
              {text.home.badge}
            </p>
            <h1 className="mt-4 font-display text-5xl leading-tight text-navy md:text-7xl">
              {text.home.title}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-steel">{text.home.intro}</p>

            <div className="mt-10 max-w-3xl">
              <SearchForm />
              <p className="mt-3 text-xs uppercase tracking-[0.18em] text-steel">{text.home.tryLabel}</p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <div className="rounded-[24px] bg-[#fffaf3] p-5 shadow-sm">
                <p className="text-xs uppercase tracking-[0.14em] text-accent">
                  {isZh ? "输入公司" : "Input"}
                </p>
                <p className="mt-3 text-lg font-semibold leading-8 text-navy">
                  {isZh ? "公司 / 代码 + 可选竞对" : "Ticker / company + optional peers"}
                </p>
              </div>
              <div className="rounded-[24px] bg-[#fffaf3] p-5 shadow-sm">
                <p className="text-xs uppercase tracking-[0.14em] text-accent">
                  {isZh ? "分析逻辑" : "Framework"}
                </p>
                <p className="mt-3 text-lg font-semibold leading-8 text-navy">
                  {isZh ? "商业模式 + KPI + 风险 + 估值" : "Business model + KPI + risk + valuation"}
                </p>
              </div>
              <div className="rounded-[24px] bg-[#f5e3d5] p-5 shadow-sm">
                <p className="text-xs uppercase tracking-[0.14em] text-accent">
                  {isZh ? "输出结果" : "Output"}
                </p>
                <p className="mt-3 text-lg font-semibold leading-8 text-accent">
                  {isZh ? "一份带明确结论的商业分析" : "A teardown that ends in a call"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-[#e8dccd] bg-[#fffaf3] p-6">
            <p className="text-sm font-semibold tracking-[0.12em] text-accent">
              {isZh ? "分析流程预览" : "Analysis flow preview"}
            </p>
            <div className="mt-5 space-y-4">
              {[
                {
                  step: "01",
                  title: isZh ? "识别用户与使用场景" : "Map users and use cases",
                  body: isZh
                    ? "先判断真正的客户是谁，产品解决的是什么需求。"
                    : "Start from the real customer and the need being solved."
                },
                {
                  step: "02",
                  title: isZh ? "拆收入与 KPI 公式" : "Break revenue into KPI formulas",
                  body: isZh
                    ? "把收入还原为 GMV、Take Rate、ARPU、频次等驱动。"
                    : "Translate revenue into GMV, take rate, ARPU, and frequency."
                },
                {
                  step: "03",
                  title: isZh ? "竞对与增长约束" : "Benchmark competition and constraints",
                  body: isZh
                    ? "看护城河是否成立，增长可能被什么因素打断。"
                    : "Test the moat and the factors that could break growth."
                },
                {
                  step: "04",
                  title: isZh ? "估值联动经营假设" : "Link valuation to operating assumptions",
                  body: isZh
                    ? "直接调增长、利润率、折现率，看价值如何变化。"
                    : "Change growth, margin, and discount rate to see valuation move."
                }
              ].map((item) => (
                <div key={item.step} className="grid grid-cols-[56px_1fr] gap-4 rounded-[22px] bg-white p-4 shadow-sm">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f5e3d5] font-display text-2xl font-semibold text-accent">
                    {item.step}
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-navy">{item.title}</p>
                    <p className="mt-1 text-sm leading-7 text-steel">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          <div className="rounded-[28px] bg-[#fffaf3] p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-accent">{text.home.cards[0]}</p>
            <p className="mt-4 text-lg leading-8 text-ink">{text.home.cardBodies[0]}</p>
          </div>
          <div className="rounded-[28px] bg-white p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-accent">{text.home.cards[1]}</p>
            <p className="mt-4 text-lg leading-8 text-ink">{text.home.cardBodies[1]}</p>
          </div>
          <div className="rounded-[28px] bg-[#f5e5da] p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-accentDark">{text.home.cards[2]}</p>
            <p className="mt-4 text-lg leading-8 text-ink">{text.home.cardBodies[2]}</p>
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between rounded-[30px] border border-white/60 bg-white/70 px-8 py-6 shadow-card">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">{text.home.methodologyTitle}</p>
          <p className="mt-2 text-sm leading-6 text-ink">{text.home.methodologyBody}</p>
        </div>
        <Link
          href="/methodology"
          className="rounded-full bg-accent px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white"
        >
          {text.home.methodologyCta}
        </Link>
      </div>
    </main>
  );
}
