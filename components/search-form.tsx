"use client";

import { useLanguage } from "@/components/language-provider";
import { getCopy } from "@/lib/copy";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function SearchForm() {
  const router = useRouter();
  const { locale } = useLanguage();
  const text = getCopy(locale);
  const [query, setQuery] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = query.trim().toUpperCase();
    if (!normalized) {
      return;
    }
    router.push(`/company/${encodeURIComponent(normalized)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 md:flex-row">
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={text.search.placeholder}
        className="h-14 flex-1 rounded-2xl border border-white/60 bg-white/90 px-5 text-base text-ink outline-none ring-0 placeholder:text-steel shadow-card"
      />
      <button
        type="submit"
        className="h-14 rounded-2xl bg-accent px-6 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-accentDark"
      >
        {text.search.button}
      </button>
    </form>
  );
}
