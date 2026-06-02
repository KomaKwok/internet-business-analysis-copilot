"use client";

import { useLanguage } from "@/components/language-provider";
import { getCopy } from "@/lib/copy";
import Link from "next/link";

export default function MethodologyPage() {
  const { locale } = useLanguage();
  const text = getCopy(locale);
  const isZh = locale === "zh";

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10 lg:px-10">
      <div className="rounded-[36px] border border-white/60 bg-white/70 p-8 shadow-card">
        <Link href="/" className="text-xs font-semibold uppercase tracking-[0.24em] text-steel">
          {text.common.backHome}
        </Link>
        <h1 className="mt-4 font-display text-5xl text-navy">{text.methodology.title}</h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-steel">{text.methodology.intro}</p>

        <div className="mt-10 grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
          <aside className="rounded-[28px] bg-[#fffaf3] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              {isZh ? "如何阅读这个产品" : "How to read this product"}
            </p>
            <div className="mt-4 space-y-4">
              {[
                isZh ? "先看用户和使用场景，确认公司服务的是谁。" : "Start with users and use cases.",
                isZh ? "再看收入公式，判断增长到底来自哪里。" : "Then examine the revenue formula.",
                isZh ? "接着看 KPI 与竞对，判断优势能否持续。" : "Use KPI and peers to test the moat.",
                isZh ? "最后把经营假设和估值联动起来。" : "Finally connect operating assumptions to valuation."
              ].map((item, index) => (
                <div key={item} className="grid grid-cols-[36px_1fr] gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5e3d5] text-sm font-semibold text-accent">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-7 text-steel">{item}</p>
                </div>
              ))}
            </div>
          </aside>

          <div className="grid gap-5">
            {text.methodology.sections.map((section, index) => (
              <section key={section.title} className="rounded-[28px] bg-panel p-6 shadow-sm">
                <div className="flex items-center gap-4 border-b border-[#eadfce] pb-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f5e3d5] font-display text-2xl font-semibold text-accent">
                    {index + 1}
                  </div>
                  <p className="font-display text-3xl text-navy">{section.title}</p>
                </div>
                <p className="mt-4 text-base leading-8 text-ink">{section.text}</p>
              </section>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
