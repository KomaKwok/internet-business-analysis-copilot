import { searchCompanyContext } from "@/lib/search/bocha";
import { getSecRevenue } from "@/lib/finance/sec";

// The same two tools the product uses — but here the model decides when to call them.
export const toolSchemas = [
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the live web for up-to-date information about a company.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "search query" } },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_sec_revenue",
      description: "Authoritative annual revenue (USD) from official SEC filings for a US-listed ticker.",
      parameters: {
        type: "object",
        properties: { ticker: { type: "string", description: "stock ticker, e.g. UBER" } },
        required: ["ticker"]
      }
    }
  }
];

export async function runTool(name: string, args: Record<string, unknown>): Promise<string> {
  // A tool failure must not crash the run — return it as a result the agent can
  // react to (retry with a different query, or proceed with what it has).
  try {
    if (name === "web_search") {
      const docs = await searchCompanyContext(String(args.query || ""));
      return (
        docs
          .slice(0, 5)
          .map((d) => `- ${d.title}: ${(d.snippet || "").slice(0, 180)}`)
          .join("\n") || "no results"
      );
    }
    if (name === "get_sec_revenue") {
      const sec = await getSecRevenue(String(args.ticker || ""));
      if (!sec) {
        return "no annual USD revenue found in SEC filings";
      }
      const latest = sec.revenueHistory[sec.revenueHistory.length - 1];
      return `Annual revenue (USD): ${sec.revenue.toLocaleString()}${latest ? ` for FY ${latest.year}` : ""}`;
    }
    return "unknown tool";
  } catch (error) {
    const message = error instanceof Error ? error.message : "tool failed";
    return `TOOL ERROR (${message}). Try a different query, or proceed and note the gap.`;
  }
}
