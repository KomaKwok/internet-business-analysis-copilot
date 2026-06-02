"use client";

import { useLanguage } from "@/components/language-provider";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();

  return (
    <div className="fixed right-5 top-5 z-50 rounded-full border border-white/70 bg-white/85 p-1 shadow-card backdrop-blur">
      <div className="flex items-center gap-1">
        {[
          { key: "en", label: "EN" },
          { key: "zh", label: "中文" }
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setLocale(item.key as "en" | "zh")}
            className={cn(
              "rounded-full px-4 py-2 text-xs font-semibold tracking-[0.18em] transition",
              locale === item.key
                ? "bg-accent text-white"
                : "text-steel hover:bg-white hover:text-navy"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
