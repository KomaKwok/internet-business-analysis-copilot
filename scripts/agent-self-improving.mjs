// Phase 2: self-improving agent system (agent self-improvement).
// Adds to the orchestration two mechanisms:
//   (A) within-run REFLECTION loop: Critic -> targeted fix -> re-Critic, until it passes
//   (B) cross-run MEMORY: distil a lesson each run, inject past lessons into future runs
// Run:  node scripts/agent-self-improving.mjs PDD
import fs from "node:fs";

const env = {};
for (const line of fs.readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim();
}
const DEEPSEEK_KEY = env.DEEPSEEK_API_KEY;
const BOCHA_KEY = env.BOCHA_API_KEY;
const SEC_UA = "agent-self-improving (contact: research@example.com)";
const MEMORY_PATH = new URL("./agent-memory.json", import.meta.url);
const PASS_BAR = 8;
const MAX_ROUNDS = 2;

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

// ---- tools ----
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
    cikMapPromise = fetch("https://www.sec.gov/files/company_tickers.json", { headers: { "User-Agent": SEC_UA } })
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
        (p) => (p.form === "10-K" || p.form === "20-F") && p.start && p.end && (Date.parse(p.end) - Date.parse(p.start)) / 86400000 > 350
      );
      if (annual.length) {
        const last = annual[annual.length - 1];
        return `Annual revenue (USD): ${last.val.toLocaleString()} for FY ending ${last.end}`;
      }
    } catch {
      /* next */
    }
  }
  return "no annual USD revenue found in SEC filings";
}
const toolSchemas = [
  { type: "function", function: { name: "web_search", description: "Search the live web.", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } } },
  { type: "function", function: { name: "get_sec_revenue", description: "Annual revenue (USD) from SEC filings.", parameters: { type: "object", properties: { ticker: { type: "string" } }, required: ["ticker"] } } }
];
async function runTool(name, args) {
  if (name === "web_search") return webSearch(args.query);
  if (name === "get_sec_revenue") return getSecRevenue(args.ticker);
  return "unknown tool";
}

// ---- (B) cross-run memory ----
function loadMemory() {
  try {
    return JSON.parse(fs.readFileSync(MEMORY_PATH, "utf8")).lessons || [];
  } catch {
    return [];
  }
}
function saveMemory(lessons) {
  fs.writeFileSync(MEMORY_PATH, JSON.stringify({ lessons }, null, 2));
}
function lessonsBlock(lessons) {
  if (!lessons.length) return "";
  return "\n\nLessons learned from past runs — apply them:\n" + lessons.map((l) => `- ${l}`).join("\n");
}

// ---- agents ----
async function plannerAgent(ticker, lessons) {
  const msg = await callLLM({
    json: true,
    messages: [
      { role: "system", content: "You are the planning agent. Output JSON {\"tasks\":[{\"id\":1,\"focus\":\"...\"},{\"id\":2,...},{\"id\":3,...}]} with 3 tasks covering (a) business model+users+monetization, (b) figures to value it (revenue, price, market cap, shares), (c) competition+risks." + lessonsBlock(lessons) },
      { role: "user", content: `Plan research for ${ticker}.` }
    ]
  });
  return JSON.parse(msg.content).tasks;
}
async function researcherAgent(ticker, focus, label, lessons, budget = 2) {
  const messages = [
    { role: "system", content: `You are a research sub-agent. Task: "${focus}". Gather concrete evidence about ${ticker} with the tools. Make at most ${budget} tool calls, then summarize concrete findings (facts, figures, uncertainty) in 3-4 bullets.` + lessonsBlock(lessons) },
    { role: "user", content: `Research ${ticker}: ${focus}` }
  ];
  for (let i = 0; i <= budget; i++) {
    const msg = await callLLM({ messages, tools: toolSchemas });
    messages.push(msg);
    if (msg.tool_calls && msg.tool_calls.length) {
      for (const tc of msg.tool_calls) {
        const args = JSON.parse(tc.function.arguments || "{}");
        console.log(`   [${label}] ${tc.function.name}(${JSON.stringify(args).slice(0, 64)})`);
        messages.push({ role: "tool", tool_call_id: tc.id, content: await runTool(tc.function.name, args) });
      }
    } else {
      return msg.content;
    }
  }
  const wrap = await callLLM({ messages: [...messages, { role: "user", content: "Summarize findings now in 3-4 bullets." }] });
  return wrap.content;
}
async function synthesizerAgent(ticker, findings, lessons) {
  const evidence = findings.map((f, i) => `### Findings ${i + 1}\n${f}`).join("\n\n");
  const msg = await callLLM({
    messages: [
      { role: "system", content: "You are the synthesis agent. Write: 1) business model in one line; 2) key growth driver; 3) valuation read using the figures (revenue, price, market cap, shares; compute rough P/S); 4) verdict cheap/fair/expensive with one reason. Separate facts from assumptions; if a number is missing, say so." + lessonsBlock(lessons) },
      { role: "user", content: `Company: ${ticker}\n\n${evidence}` }
    ]
  });
  return msg.content;
}
async function criticAgent(analysis, findings) {
  const msg = await callLLM({
    json: true,
    messages: [
      {
        role: "system",
        content:
          "You are the critic agent. Judge the analysis ONLY against the findings, scoring REASONING QUALITY, not whether a verdict was reachable. " +
          "Score 0-10 on: (a) every claim is grounded in the findings, (b) assumptions are clearly separated from facts, (c) no contradictory or hallucinated numbers, " +
          "(d) HONEST handling of missing data. IMPORTANT: an analysis that correctly states a figure is unavailable and explains the limit should score HIGH — do NOT penalize honesty about missing data. " +
          'Output JSON {"score":0-10,"sound":bool,"issues":["..."],"missing_data":["..."]}. ' +
          '"sound" = the reasoning is well-grounded and honest given the available data. "missing_data" = genuinely useful figures that were absent (informational).'
      },
      { role: "user", content: `FINDINGS:\n${findings.join("\n\n")}\n\nANALYSIS:\n${analysis}` }
    ]
  });
  return JSON.parse(msg.content);
}
// targeted researcher to close a specific gap
async function gapResearcher(ticker, missing, lessons) {
  const focus =
    `Find these specific figures for ${ticker}: ${missing.join(", ")}. ` +
    "Tip: market cap = share price × shares outstanding, so if you find current price and share count you can derive it. " +
    "Search with explicit queries and read the numbers from the results.";
  return researcherAgent(ticker, focus, "GAP", lessons, 3);
}
async function reviseAgent(ticker, analysis, issues, findings, lessons) {
  const msg = await callLLM({
    messages: [
      { role: "system", content: "You are the revision agent. Rewrite the analysis to fix the critic's issues, using ONLY the findings. Keep the same 4-part structure. Do not invent numbers." + lessonsBlock(lessons) },
      { role: "user", content: `FINDINGS:\n${findings.join("\n\n")}\n\nCURRENT ANALYSIS:\n${analysis}\n\nFIX THESE ISSUES:\n- ${issues.join("\n- ")}` }
    ]
  });
  return msg.content;
}
// reflector: distil a general, reusable lesson from this run
async function reflectorAgent(review, existing) {
  const msg = await callLLM({
    json: true,
    messages: [
      { role: "system", content: 'You distil lessons for a company-analysis agent. From the critique, output JSON {"lessons":["..."]} with AT MOST 1 general, reusable lesson (not company-specific) that would help future runs avoid this problem. If nothing generalizable, return {"lessons":[]}. Do not repeat an existing lesson.' },
      { role: "user", content: `EXISTING LESSONS:\n- ${existing.join("\n- ") || "(none)"}\n\nTHIS RUN'S CRITIQUE:\n${JSON.stringify(review)}` }
    ]
  });
  return JSON.parse(msg.content).lessons || [];
}

// =====================  ORCHESTRATOR with self-improvement  =====================
const ticker = (process.argv[2] || "PDD").toUpperCase();
let lessons = loadMemory();
console.log(`\n═══════ SELF-IMPROVING AGENT: analyze ${ticker} ═══════`);
console.log(`[MEMORY] loaded ${lessons.length} lesson(s) from past runs${lessons.length ? ":" : "."}`);
lessons.forEach((l) => console.log(`   • ${l}`));

console.log("\n[PLANNER] planning...");
const tasks = await plannerAgent(ticker, lessons);
tasks.forEach((t) => console.log(`   → ${t.focus}`));

console.log(`\n[RESEARCHER ×${tasks.length}] gathering in parallel...`);
let findings = await Promise.all(tasks.map((t) => researcherAgent(ticker, t.focus, `R${t.id}`, lessons)));

console.log("\n[SYNTHESIZER] composing analysis...");
let analysis = await synthesizerAgent(ticker, findings, lessons);
console.log("\n[CRITIC] reviewing...");
let review = await criticAgent(analysis, findings);
console.log(`   round 0 → score ${review.score}/10 | sound: ${review.sound} | missing: [${(review.missing_data || []).join(", ")}]`);

// ---- (A) within-run reflection loop: try to fill a gap ONCE, then revise reasoning ----
let round = 0;
let triedGap = false;
while (round < MAX_ROUNDS && review.score < PASS_BAR) {
  round++;
  if (review.missing_data?.length && !triedGap) {
    triedGap = true;
    console.log(`\n[SELF-IMPROVE round ${round}] score below ${PASS_BAR} → re-dispatching a researcher to try to close gap: [${review.missing_data.join(", ")}]`);
    const gap = await gapResearcher(ticker, review.missing_data, lessons);
    findings = [...findings, gap];
    console.log("[SYNTHESIZER] re-composing with the new evidence...");
    analysis = await synthesizerAgent(ticker, findings, lessons);
  } else {
    console.log(`\n[SELF-IMPROVE round ${round}] score below ${PASS_BAR} → revising reasoning against critic feedback...`);
    review.issues?.forEach((i) => console.log(`      fix: ${i}`));
    analysis = await reviseAgent(ticker, analysis, review.issues || [], findings, lessons);
  }
  review = await criticAgent(analysis, findings);
  console.log(`[CRITIC] round ${round} → score ${review.score}/10 | sound: ${review.sound}`);
}

console.log("\n────────── FINAL ANALYSIS ──────────\n");
console.log(analysis);
console.log(`\n(final score ${review.score}/10 after ${round} improvement round(s))`);

// ---- (B) learn for next time ----
console.log("\n[REFLECTOR] distilling a lesson for future runs...");
const newLessons = await reflectorAgent(review, lessons);
if (newLessons.length) {
  lessons = [...lessons, ...newLessons].slice(-10);
  saveMemory(lessons);
  newLessons.forEach((l) => console.log(`   + learned: ${l}`));
  console.log(`[MEMORY] saved — now ${lessons.length} lesson(s). Next run will use them.`);
} else {
  console.log("   (nothing new worth generalizing this run)");
}
console.log(`\n═══════ DONE ═══════\n`);
