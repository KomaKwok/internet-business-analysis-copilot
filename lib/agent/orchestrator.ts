import { Locale } from "@/components/language-provider";
import { agentLLM, ChatMessage } from "@/lib/agent/llm";
import { toolSchemas, runTool } from "@/lib/agent/tools";
import { loadLessons, saveLessons } from "@/lib/agent/memory";

const PASS_BAR = 8;
const MAX_ROUNDS = 2;

export type AgentEvent =
  | { type: "memory"; lessons: string[] }
  | { type: "planner"; tasks: { id: number; focus: string }[] }
  | { type: "tool"; agent: string; tool: string; args: Record<string, unknown> }
  | { type: "phase"; label: string }
  | { type: "critic"; round: number; score: number; sound: boolean; missing: string[]; issues: string[] }
  | { type: "improve"; round: number; mode: "gap" | "revise"; detail: string }
  | { type: "final"; analysis: string; score: number; rounds: number }
  | { type: "reflector"; learned: string[]; total: number }
  | { type: "error"; message: string }
  | { type: "done" };

type Emit = (event: AgentEvent) => void;

function lessonsBlock(lessons: string[]) {
  if (!lessons.length) return "";
  return "\n\nLessons learned from past runs — apply them:\n" + lessons.map((l) => `- ${l}`).join("\n");
}

// 1) PLANNER
async function planner(ticker: string, lessons: string[]) {
  const msg = await agentLLM({
    json: true,
    messages: [
      {
        role: "system",
        content:
          'You are the planning agent. Output JSON {"tasks":[{"id":1,"focus":"..."},{"id":2,...},{"id":3,...}]} ' +
          "with 3 tasks covering (a) business model + users + monetization, (b) figures to value it (revenue, price, market cap, shares), (c) competition + risks." +
          lessonsBlock(lessons)
      },
      { role: "user", content: `Plan research for ${ticker}.` }
    ]
  });
  const parsed = JSON.parse(msg.content || "{}");
  return (parsed.tasks || []) as { id: number; focus: string }[];
}

// 2) RESEARCHER (tool-using sub-agent)
async function researcher(
  ticker: string,
  focus: string,
  label: string,
  lessons: string[],
  emit: Emit,
  budget = 2
) {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        `You are a research sub-agent. Task: "${focus}". Gather concrete evidence about ${ticker} with the tools. ` +
        `Make at most ${budget} tool calls, then summarize concrete findings (facts, figures, uncertainty) in 3-4 bullets.` +
        lessonsBlock(lessons)
    },
    { role: "user", content: `Research ${ticker}: ${focus}` }
  ];
  for (let i = 0; i <= budget; i++) {
    const msg = await agentLLM({ messages, tools: toolSchemas });
    messages.push(msg);
    if (msg.tool_calls?.length) {
      for (const tc of msg.tool_calls) {
        const args = JSON.parse(tc.function.arguments || "{}");
        emit({ type: "tool", agent: label, tool: tc.function.name, args });
        const result = await runTool(tc.function.name, args);
        messages.push({ role: "tool", tool_call_id: tc.id, content: result });
      }
    } else {
      return msg.content || "";
    }
  }
  const wrap = await agentLLM({
    messages: [...messages, { role: "user", content: "Summarize your findings now in 3-4 bullets." }]
  });
  return wrap.content || "";
}

// 3) SYNTHESIZER
async function synthesizer(ticker: string, findings: string[], lessons: string[], locale: Locale) {
  const evidence = findings.map((f, i) => `### Findings ${i + 1}\n${f}`).join("\n\n");
  const msg = await agentLLM({
    messages: [
      {
        role: "system",
        content:
          "You are the synthesis agent. Write: 1) business model in one line; 2) key growth driver; " +
          "3) valuation read using the figures (revenue, price, market cap, shares; compute a rough P/S if possible); " +
          "4) verdict — cheap / fair / expensive — with one reason. Clearly separate facts from assumptions; if a number is missing, say so honestly. " +
          (locale === "zh" ? "Write the analysis in Simplified Chinese." : "Write in English.") +
          lessonsBlock(lessons)
      },
      { role: "user", content: `Company: ${ticker}\n\n${evidence}` }
    ]
  });
  return msg.content || "";
}

// 4) CRITIC (rewards honesty, penalizes only reasoning flaws)
async function critic(analysis: string, findings: string[]) {
  const msg = await agentLLM({
    json: true,
    messages: [
      {
        role: "system",
        content:
          "You are the critic agent. Judge the analysis ONLY against the findings, scoring REASONING QUALITY, not whether a verdict was reachable. " +
          "Score 0-10 on: (a) claims grounded in findings, (b) assumptions separated from facts, (c) no contradictory or hallucinated numbers, " +
          "(d) HONEST handling of missing data. An analysis that correctly states a figure is unavailable and explains the limit should score HIGH — do NOT penalize honesty. " +
          'Output JSON {"score":0-10,"sound":bool,"issues":["..."],"missing_data":["..."]}.'
      },
      { role: "user", content: `FINDINGS:\n${findings.join("\n\n")}\n\nANALYSIS:\n${analysis}` }
    ]
  });
  const r = JSON.parse(msg.content || "{}");
  return {
    score: Number(r.score) || 0,
    sound: Boolean(r.sound),
    issues: (r.issues || []) as string[],
    missing_data: (r.missing_data || []) as string[]
  };
}

async function gapResearcher(ticker: string, missing: string[], lessons: string[], emit: Emit) {
  const focus =
    `Find these specific figures for ${ticker}: ${missing.join(", ")}. ` +
    "Tip: market cap = share price × shares outstanding, so finding current price and share count lets you derive it. Use explicit queries.";
  return researcher(ticker, focus, "GAP", lessons, emit, 3);
}

async function reviser(ticker: string, analysis: string, issues: string[], findings: string[], lessons: string[], locale: Locale) {
  const msg = await agentLLM({
    messages: [
      {
        role: "system",
        content:
          "You are the revision agent. Rewrite the analysis to fix the critic's issues, using ONLY the findings. Keep the same 4-part structure. Do not invent numbers. " +
          (locale === "zh" ? "Write in Simplified Chinese." : "Write in English.") +
          lessonsBlock(lessons)
      },
      {
        role: "user",
        content: `FINDINGS:\n${findings.join("\n\n")}\n\nCURRENT ANALYSIS:\n${analysis}\n\nFIX THESE ISSUES:\n- ${issues.join("\n- ")}`
      }
    ]
  });
  return msg.content || analysis;
}

async function reflector(review: { score: number; issues: string[] }, existing: string[]) {
  const msg = await agentLLM({
    json: true,
    messages: [
      {
        role: "system",
        content:
          'You distil lessons for a company-analysis agent. Output JSON {"lessons":["..."]} with AT MOST 1 general, reusable lesson ' +
          "(not company-specific) that would help future runs. If nothing generalizable, return {\"lessons\":[]}. Do not repeat an existing lesson."
      },
      { role: "user", content: `EXISTING LESSONS:\n- ${existing.join("\n- ") || "(none)"}\n\nTHIS RUN'S CRITIQUE:\n${JSON.stringify(review)}` }
    ]
  });
  return (JSON.parse(msg.content || "{}").lessons || []) as string[];
}

export async function orchestrate(ticker: string, locale: Locale, emit: Emit) {
  const lessons = await loadLessons();
  emit({ type: "memory", lessons });

  emit({ type: "phase", label: "planner" });
  const tasks = await planner(ticker, lessons);
  emit({ type: "planner", tasks });

  emit({ type: "phase", label: "researchers" });
  let findings = await Promise.all(tasks.map((t) => researcher(ticker, t.focus, `R${t.id}`, lessons, emit)));

  emit({ type: "phase", label: "synthesizer" });
  let analysis = await synthesizer(ticker, findings, lessons, locale);

  let review = await critic(analysis, findings);
  emit({ type: "critic", round: 0, score: review.score, sound: review.sound, missing: review.missing_data, issues: review.issues });

  // within-run reflection loop: fill a gap once, then revise reasoning
  let round = 0;
  let triedGap = false;
  while (round < MAX_ROUNDS && review.score < PASS_BAR) {
    round++;
    if (review.missing_data.length && !triedGap) {
      triedGap = true;
      emit({ type: "improve", round, mode: "gap", detail: review.missing_data.join(", ") });
      const gap = await gapResearcher(ticker, review.missing_data, lessons, emit);
      findings = [...findings, gap];
      analysis = await synthesizer(ticker, findings, lessons, locale);
    } else {
      emit({ type: "improve", round, mode: "revise", detail: review.issues.slice(0, 3).join(" · ") });
      analysis = await reviser(ticker, analysis, review.issues, findings, lessons, locale);
    }
    review = await critic(analysis, findings);
    emit({ type: "critic", round, score: review.score, sound: review.sound, missing: review.missing_data, issues: review.issues });
  }

  emit({ type: "final", analysis, score: review.score, rounds: round });

  const learned = await reflector({ score: review.score, issues: review.issues }, lessons);
  if (learned.length) {
    const updated = [...lessons, ...learned].slice(-10);
    await saveLessons(updated);
    emit({ type: "reflector", learned, total: updated.length });
  } else {
    emit({ type: "reflector", learned: [], total: lessons.length });
  }

  emit({ type: "done" });
}
