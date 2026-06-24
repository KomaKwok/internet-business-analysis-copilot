// Standalone demo: the SAME two tools your product uses (web search + SEC),
// but here the MODEL decides which to call and when it has enough.
// Run:  node scripts/agent-demo.mjs PDD
import fs from "node:fs";

// --- load keys from .env (a raw node script doesn't get them automatically) ---
const env = {};
for (const line of fs.readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim();
}
const DEEPSEEK_KEY = env.DEEPSEEK_API_KEY;
const BOCHA_KEY = env.BOCHA_API_KEY;
const SEC_UA = "agent-demo (contact: research@example.com)";

// =====================  TOOL IMPLEMENTATIONS  =====================
// These are the real actions. The model can only ASK for them; this code runs them.

async function webSearch(query) {
  const r = await fetch("https://api.bochaai.com/v1/web-search", {
    method: "POST",
    headers: { Authorization: `Bearer ${BOCHA_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, freshness: "oneYear", summary: true, count: 5 })
  });
  const d = await r.json();
  const items = d?.data?.webPages?.value || [];
  return (
    items.map((i) => `- ${i.name}: ${(i.summary || i.snippet || "").slice(0, 200)}`).join("\n") ||
    "no results"
  );
}

let cikMap = null;
async function getSecRevenue(ticker) {
  if (!cikMap) {
    const r = await fetch("https://www.sec.gov/files/company_tickers.json", {
      headers: { "User-Agent": SEC_UA }
    });
    const raw = await r.json();
    cikMap = {};
    for (const v of Object.values(raw)) cikMap[v.ticker.toUpperCase()] = String(v.cik_str).padStart(10, "0");
  }
  const cik = cikMap[ticker.toUpperCase()];
  if (!cik) return "ticker not found in SEC registry";
  for (const concept of ["RevenueFromContractWithCustomerExcludingAssessedTax", "Revenues"]) {
    try {
      const r = await fetch(
        `https://data.sec.gov/api/xbrl/companyconcept/CIK${cik}/us-gaap/${concept}.json`,
        { headers: { "User-Agent": SEC_UA } }
      );
      if (!r.ok) continue;
      const d = await r.json();
      const usd = d.units?.USD;
      if (!usd) continue;
      const annual = usd.filter(
        (p) =>
          (p.form === "10-K" || p.form === "20-F") &&
          p.start &&
          p.end &&
          (Date.parse(p.end) - Date.parse(p.start)) / 86400000 > 350
      );
      if (annual.length) {
        const last = annual[annual.length - 1];
        return `Annual revenue (USD): ${last.val.toLocaleString()} for FY ending ${last.end}`;
      }
    } catch {
      /* try next concept */
    }
  }
  return "no annual USD revenue found in SEC filings";
}

// =====================  TOOL SCHEMAS (what we tell the model)  =====================
const tools = [
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
      description: "Fetch authoritative annual revenue (USD) from official SEC filings for a US-listed ticker.",
      parameters: {
        type: "object",
        properties: { ticker: { type: "string", description: "stock ticker, e.g. PDD" } },
        required: ["ticker"]
      }
    }
  }
];

async function runTool(name, args) {
  if (name === "web_search") return webSearch(args.query);
  if (name === "get_sec_revenue") return getSecRevenue(args.ticker);
  return "unknown tool";
}

// =====================  THE AGENT LOOP  =====================
const ticker = (process.argv[2] || "PDD").toUpperCase();
const messages = [
  {
    role: "system",
    content:
      "You are an internet-company analyst. You have tools to search the web and to fetch official revenue from SEC. " +
      "Decide YOURSELF what to look up and when you have enough, then write a 4-sentence analysis that ends with whether " +
      "the stock looks expensive or cheap and why. " +
      "Be efficient: make at most 3 tool calls total. Do not keep searching for the same number — if a figure is hard to " +
      "find after one or two tries, proceed and say it is uncertain. Then write your answer."
  },
  { role: "user", content: `Analyze ${ticker}.` }
];

console.log(`\n=== AGENT START: analyze ${ticker} ===`);
console.log("(the model, not the code, chooses each step)\n");

for (let step = 1; step <= 8; step++) {
  const r = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${DEEPSEEK_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "deepseek-chat", messages, tools, tool_choice: "auto", temperature: 0.2 })
  });
  const d = await r.json();
  if (!d.choices) {
    console.log("API error:", JSON.stringify(d).slice(0, 300));
    break;
  }
  const msg = d.choices[0].message;
  messages.push(msg);

  if (msg.tool_calls && msg.tool_calls.length) {
    for (const tc of msg.tool_calls) {
      const args = JSON.parse(tc.function.arguments || "{}");
      console.log(`[step ${step}] the model chose to call:  ${tc.function.name}(${JSON.stringify(args)})`);
      const result = await runTool(tc.function.name, args);
      console.log(`           result it got back:  ${result.slice(0, 150).replace(/\n/g, " ")} ...\n`);
      messages.push({ role: "tool", tool_call_id: tc.id, content: result });
    }
  } else {
    console.log(`[step ${step}] the model decided it has enough and wrote its answer:\n`);
    console.log(msg.content);
    break;
  }
}
console.log(`\n=== AGENT END ===\n`);
