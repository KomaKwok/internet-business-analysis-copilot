// Phase 1: complex multi-agent orchestration (复杂 agent 编排).
// An ORCHESTRATOR coordinates four kinds of agents:
//   Planner  ->  Researcher x N (parallel, tool-using)  ->  Synthesizer  ->  Critic
// Run:  node scripts/agent-orchestrator.mjs PDD
import fs from "node:fs";

// ---- load keys ----
const env = {};
for (const line of fs.readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim();
}
const DEEPSEEK_KEY = env.DEEPSEEK_API_KEY;
const BOCHA_KEY = env.BOCHA_API_KEY;
const SEC_UA = "agent-orchestrator (contact: research@example.com)";

// =====================  LLM helper  =====================
async function callLLM({ messages, tools, json }) {
  const body = { model: "deepseek-chat", messages, temperature: 0.2 };
  if (tools) {
    body.tools = tools;
    body.tool_choice = "auto";
  }
  if (json) body.response_format = { type: "json_object" };
  const r = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${DEEPSEEK_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const d = await r.json();
  if (!d.choices) throw new Error("LLM error: " + JSON.stringify(d).slice(0, 200));
  return d.choices[0].message;
}

// =====================  TOOLS  =====================
async function webSearch(query) {
  const r = await fetch("https://api.bochaai.com/v1/web-search", {
    method: "POST",
    headers: { Authorization: `Bearer ${BOCHA_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, freshness: "oneYear", summary: true, count: 5 })
  });
  const d = await r.json();
  const items = d?.data?.webPages?.value || [];
  return items.map((i) => `- ${i.name}: ${(i.summary || i.snippet || "").slice(0, 180)}`).join("\n") || "no results";
}

let cikMapPromise = null;
function loadCikMap() {
  if (!cikMapPromise) {
    cikMapPromise = fetch("https://www.sec.gov/files/company_tickers.json", {
      headers: { "User-Agent": SEC_UA }
    })
      .then((r) => r.json())
      .then((raw) => {
        const map = {};
        for (const v of Object.values(raw)) map[v.ticker.toUpperCase()] = String(v.cik_str).padStart(10, "0");
        return map;
      });
  }
  return cikMapPromise;
}
async function getSecRevenue(ticker) {
  const map = await loadCikMap();
  const cik = map[ticker.toUpperCase()];
  if (!cik) return "ticker not found in SEC registry";
  for (const concept of ["RevenueFromContractWithCustomerExcludingAssessedTax", "Revenues"]) {
    try {
      const r = await fetch(`https://data.sec.gov/api/xbrl/companyconcept/CIK${cik}/us-gaap/${concept}.json`, {
        headers: { "User-Agent": SEC_UA }
      });
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
      /* next concept */
    }
  }
  return "no annual USD revenue found in SEC filings";
}

const toolSchemas = [
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the live web for up-to-date info about a company.",
      parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }
    }
  },
  {
    type: "function",
    function: {
      name: "get_sec_revenue",
      description: "Authoritative annual revenue (USD) from SEC filings for a US-listed ticker.",
      parameters: { type: "object", properties: { ticker: { type: "string" } }, required: ["ticker"] }
    }
  }
];
async function runTool(name, args) {
  if (name === "web_search") return webSearch(args.query);
  if (name === "get_sec_revenue") return getSecRevenue(args.ticker);
  return "unknown tool";
}

// =====================  AGENTS  =====================

// 1) PLANNER — decides what to research.
async function plannerAgent(ticker) {
  const msg = await callLLM({
    json: true,
    messages: [
      {
        role: "system",
        content:
          "You are the planning agent in a multi-agent analyst system. Given a ticker, output a JSON research plan " +
          'of exactly 3 focused tasks that together cover (a) business model + users + monetization, ' +
          "(b) the financial figures needed to value it (revenue, share price, market cap, shares outstanding), and " +
          '(c) competition and key risks. Format: {"tasks":[{"id":1,"focus":"..."},{"id":2,"focus":"..."},{"id":3,"focus":"..."}]}'
      },
      { role: "user", content: `Plan the research for ${ticker}.` }
    ]
  });
  return JSON.parse(msg.content).tasks;
}

// 2) RESEARCHER — a tool-using sub-agent, one per task (bounded loop).
async function researcherAgent(ticker, task, label) {
  const messages = [
    {
      role: "system",
      content:
        `You are a research sub-agent. Your task: "${task.focus}". Gather concrete evidence about ${ticker} using the tools. ` +
        "Make at most 2 tool calls, then STOP and summarize concrete findings (facts, figures, and any uncertainty) in 3-4 short bullet points."
    },
    { role: "user", content: `Research ${ticker}: ${task.focus}` }
  ];
  for (let i = 0; i < 4; i++) {
    const msg = await callLLM({ messages, tools: toolSchemas });
    messages.push(msg);
    if (msg.tool_calls && msg.tool_calls.length) {
      for (const tc of msg.tool_calls) {
        const args = JSON.parse(tc.function.arguments || "{}");
        console.log(`   [${label}] called ${tc.function.name}(${JSON.stringify(args).slice(0, 70)})`);
        const result = await runTool(tc.function.name, args);
        messages.push({ role: "tool", tool_call_id: tc.id, content: result });
      }
    } else {
      return msg.content;
    }
  }
  // ran out of tool budget: ask for a summary with what it has
  const wrap = await callLLM({
    messages: [...messages, { role: "user", content: "Summarize your findings now in 3-4 bullets." }]
  });
  return wrap.content;
}

// 3) SYNTHESIZER — turns all findings into one analysis.
async function synthesizerAgent(ticker, findings) {
  const evidence = findings.map((f, i) => `### Findings ${i + 1}\n${f}`).join("\n\n");
  const msg = await callLLM({
    messages: [
      {
        role: "system",
        content:
          "You are the synthesis agent. From the research findings, write a tight analysis with: " +
          "1) business model in one line; 2) the key growth driver; 3) a valuation read using the figures found " +
          "(state revenue, price, market cap, shares; compute a rough P/S if possible); 4) a final verdict — cheap / fair / expensive — with one reason. " +
          "Clearly separate facts from assumptions, and if a needed number is missing, say so explicitly."
      },
      { role: "user", content: `Company: ${ticker}\n\n${evidence}` }
    ]
  });
  return msg.content;
}

// 4) CRITIC — scores the analysis against a rubric.
async function criticAgent(analysis, findings) {
  const msg = await callLLM({
    json: true,
    messages: [
      {
        role: "system",
        content:
          "You are the critic agent. Judge the analysis ONLY against the research findings provided. Output JSON: " +
          '{"score": <0-10>, "verdict_supported": <true|false>, "issues": ["..."]}. ' +
          "Penalize claims not backed by the findings, a verdict not supported by actual numbers, and assumptions presented as facts."
      },
      { role: "user", content: `FINDINGS:\n${findings.join("\n\n")}\n\nANALYSIS:\n${analysis}` }
    ]
  });
  return JSON.parse(msg.content);
}

// =====================  ORCHESTRATOR  =====================
const ticker = (process.argv[2] || "PDD").toUpperCase();
console.log(`\n═══════ ORCHESTRATOR: analyze ${ticker} ═══════\n`);

console.log("[PLANNER] deciding what to research...");
const tasks = await plannerAgent(ticker);
tasks.forEach((t) => console.log(`   → task ${t.id}: ${t.focus}`));

console.log(`\n[RESEARCHER ×${tasks.length}] gathering evidence in parallel (each is its own tool-using agent)...`);
const findings = await Promise.all(
  tasks.map((t) => researcherAgent(ticker, t, `R${t.id}`))
);
console.log("   ✓ all researchers reported back.");

console.log("\n[SYNTHESIZER] composing one analysis from all findings...\n");
const analysis = await synthesizerAgent(ticker, findings);
console.log(analysis);

console.log("\n[CRITIC] scoring the analysis against the evidence...");
const review = await criticAgent(analysis, findings);
console.log(`   → score: ${review.score}/10 | verdict supported by numbers: ${review.verdict_supported}`);
if (review.issues?.length) {
  console.log("   → issues found:");
  review.issues.forEach((i) => console.log(`      - ${i}`));
}

console.log(`\n═══════ DONE — 4 agent roles, ${2 + tasks.length} agent runs ═══════\n`);
