"use client";

import { useLanguage } from "@/components/language-provider";
import { getCopy } from "@/lib/copy";
import Link from "next/link";

export default function MethodologyPage() {
  const { locale } = useLanguage();
  const text = getCopy(locale);
  const rationale = text.designRationale;

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10 lg:px-10">
      <div className="rounded-[36px] border border-white/60 bg-white/70 p-8 shadow-card md:p-12">
        <Link href="/" className="text-xs font-semibold uppercase tracking-[0.24em] text-steel">
          {text.common.backHome}
        </Link>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-accent">
          {rationale.badge}
        </p>
        <h1 className="mt-3 font-display text-5xl leading-tight text-navy md:text-6xl">
          {rationale.title}
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-9 text-steel">{rationale.intro}</p>

        <div className="mt-10 space-y-6">
          {rationale.decisions.map((item, index) => (
            <section
              key={item.decision}
              className="rounded-[28px] border border-white/70 bg-panel p-7 shadow-card"
            >
              <div className="flex items-start gap-4">
                <span className="font-display text-4xl font-bold leading-none text-accent">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="pt-1 text-xl font-semibold leading-8 text-navy">{item.decision}</p>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-[22px] bg-[#fffaf3] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
                    {rationale.whyLabel}
                  </p>
                  <p className="mt-3 text-base leading-7 text-ink">{item.why}</p>
                </div>
                <div className="rounded-[22px] border border-dashed border-[#dfcbb8] bg-[#fffdfa] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-steel">
                    {rationale.rejectedLabel}
                  </p>
                  <p className="mt-3 text-base leading-7 text-steel">{item.rejected}</p>
                </div>
              </div>
            </section>
          ))}
        </div>

        <div className="mt-8 rounded-[28px] bg-[#f5e3d5] p-7">
          <p className="font-display text-2xl font-semibold text-accentDark">
            {rationale.closingTitle}
          </p>
          <p className="mt-3 max-w-3xl text-base leading-8 text-ink">{rationale.closingBody}</p>
        </div>
      </div>
    </main>
  );
}
