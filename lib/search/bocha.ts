import { getCached, setCached } from "@/lib/cache";
import { appConfig } from "@/lib/config";
import { SourceLink } from "@/lib/types";

type SearchDocument = SourceLink;

export async function searchCompanyContext(query: string): Promise<SearchDocument[]> {
  const cacheKey = `bocha:${query}`;
  const cached = getCached<SearchDocument[]>(cacheKey);
  if (cached) {
    return cached;
  }

  if (!appConfig.bochaApiKey) {
    return [];
  }

  const response = await fetch("https://api.bochaai.com/v1/web-search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${appConfig.bochaApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      query,
      freshness: "oneYear",
      summary: true,
      count: 10
    })
  });

  if (!response.ok) {
    throw new Error(`Bocha search failed: ${response.status}`);
  }

  const data = await response.json();
  const documents =
    data?.data?.webPages?.value?.map(
      (item: { name?: string; url?: string; summary?: string; snippet?: string; siteName?: string }) => ({
        title: item.name || "Untitled source",
        url: item.url || "",
        snippet: item.summary || item.snippet || "",
        publisher: item.siteName || "Unknown"
      })
    ).filter((item: SearchDocument) => item.url) || [];

  setCached(cacheKey, documents, appConfig.searchCacheTtlSeconds);
  return documents;
}
