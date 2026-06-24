"use client";

import { useLanguage } from "@/components/language-provider";
import type { AgentEvent } from "@/lib/agent/orchestrator";
import { Fragment, useState } from "react";

type Props = { query: string };

const T = {
  zh: {
    title: "Agent 深度分析",
    subtitle: "多个 agent 自主协作：规划 → 并行研究 → 综合 → 审查 → 自我改进。",
    run: "运行 Agent 深度分析",
    running: "Agent 运行中…",
    rerun: "重新运行",
    memory: (n: number) => `加载了 ${n} 条历史教训`,
    planner: "Planner 拆分研究任务",
    researchers: "Researcher 并行取证（每个都是独立的工具调用 agent）",
    synthesizer: "Synthesizer 综合分析",
    critic: (r: number) => (r === 0 ? "Critic 首轮审查" : `Critic 第 ${r} 轮复审`),
    improveGap: "分数未达标 → 自动补研究缺失数据",
    improveRevise: "分数未达标 → 按审查意见重写",
    final: "最终分析",
    score: "评分",
    rounds: (n: number) => `经过 ${n} 轮自我改进`,
    learned: "学到新教训（写入跨运行记忆）",
    noLearn: "本轮无新教训",
    missing: "缺失",
    error: "运行出错"
  },
  en: {
    title: "Agent deep analysis",
    subtitle: "Multiple agents collaborate autonomously: plan → parallel research → synthesize → critique → self-improve.",
    run: "Run agent deep analysis",
    running: "Agent running…",
    rerun: "Run again",
    memory: (n: number) => `Loaded ${n} lesson(s) from past runs`,
    planner: "Planner split the research into tasks",
    researchers: "Researchers gathering in parallel (each its own tool-using agent)",
    synthesizer: "Synthesizer composing the analysis",
    critic: (r: number) => (r === 0 ? "Critic first review" : `Critic re-review, round ${r}`),
    improveGap: "Below the bar → auto re-researching the missing data",
    improveRevise: "Below the bar → revising against the critique",
    final: "Final analysis",
    score: "Score",
    rounds: (n: number) => `after ${n} self-improvement round(s)`,
    learned: "Learned a new lesson (saved to cross-run memory)",
    noLearn: "No new lesson this run",
    missing: "missing",
    error: "Run error"
  }
};

function RichText({ text }: { text: string }) {
  return (
    <div className="space-y-1 text-sm leading-7 text-ink">
      {text.split("\n").map((line, i) => {
        const parts = line.split("**");
        return (
          <p key={i} className={line.trim().startsWith("-") ? "pl-3" : ""}>
            {parts.map((p, j) => (j % 2 === 1 ? <strong key={j} className="text-navy">{p}</strong> : <Fragment key={j}>{p}</Fragment>))}
          </p>
        );
      })}
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const tone = score >= 8 ? "bg-[#2f8a4e]" : score >= 5 ? "bg-[#e6a23c]" : "bg-[#b55233]";
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold text-white ${tone}`}>{score}/10</span>;
}

export function AgentPanel({ query }: Props) {
  const { locale } = useLanguage();
  const t = T[locale];
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [running, setRunning] = useState(false);

  async function run() {
    setEvents([]);
    setRunning(true);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, locale })
      });
      if (!res.body) throw new Error("no stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.trim()) setEvents((prev) => [...prev, JSON.parse(line) as AgentEvent]);
        }
      }
    } catch (err) {
      setEvents((prev) => [...prev, { type: "error", message: err instanceof Error ? err.message : "failed" }]);
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="rounded-[28px] border border-[#d8c4e0] bg-[#faf6fd] p-7 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7c4ba0]">{t.title}</p>
          <p className="mt-2 max-w-xl text-sm leading-6 text-steel">{t.subtitle}</p>
        </div>
        <button
          onClick={run}
          disabled={running}
          className="rounded-full bg-[#7c4ba0] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {running ? t.running : events.length ? t.rerun : t.run}
        </button>
      </div>

      {events.length ? (
        <div className="mt-6 space-y-3 border-l-2 border-[#e1d3ec] pl-5">
          {events.map((e, i) => (
            <AgentEventRow key={i} event={e} t={t} />
          ))}
          {running ? <p className="animate-pulse text-sm text-[#7c4ba0]">●</p> : null}
        </div>
      ) : null}
    </section>
  );
}

function AgentEventRow({ event, t }: { event: AgentEvent; t: (typeof T)["en"] }) {
  switch (event.type) {
    case "memory":
      return (
        <Row chip="MEMORY" tone="#7c4ba0">
          <p className="text-sm text-navy">{t.memory(event.lessons.length)}</p>
          {event.lessons.map((l, i) => (
            <p key={i} className="mt-1 text-xs leading-6 text-steel">• {l}</p>
          ))}
        </Row>
      );
    case "planner":
      return (
        <Row chip="PLANNER" tone="#2f6f8a">
          <p className="text-sm font-medium text-navy">{t.planner}</p>
          {event.tasks.map((task) => (
            <p key={task.id} className="mt-1 text-xs leading-6 text-steel">→ {task.focus}</p>
          ))}
        </Row>
      );
    case "phase":
      if (event.label === "researchers") return <Row chip="RESEARCH" tone="#2f6f8a"><p className="text-sm text-navy">{t.researchers}</p></Row>;
      if (event.label === "synthesizer") return <Row chip="SYNTH" tone="#2f6f8a"><p className="text-sm text-navy">{t.synthesizer}</p></Row>;
      return null;
    case "tool":
      return (
        <p className="text-xs text-steel">
          <span className="font-semibold text-[#2f6f8a]">{event.agent}</span> → {event.tool}(
          {JSON.stringify(event.args).slice(0, 80)})
        </p>
      );
    case "critic":
      return (
        <Row chip="CRITIC" tone="#8a5a2f">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-navy">{t.critic(event.round)}</p>
            <ScoreBadge score={event.score} />
          </div>
          {event.missing.length ? (
            <p className="mt-1 text-xs text-steel">{t.missing}: {event.missing.join(", ")}</p>
          ) : null}
        </Row>
      );
    case "improve":
      return (
        <Row chip="IMPROVE" tone="#b55233">
          <p className="text-sm font-medium text-[#b55233]">
            {event.mode === "gap" ? t.improveGap : t.improveRevise}
          </p>
          {event.detail ? <p className="mt-1 text-xs text-steel">{event.detail}</p> : null}
        </Row>
      );
    case "final":
      return (
        <Row chip="FINAL" tone="#2f8a4e">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-navy">{t.final}</p>
            <ScoreBadge score={event.score} />
            <span className="text-xs text-steel">{t.rounds(event.rounds)}</span>
          </div>
          <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
            <RichText text={event.analysis} />
          </div>
        </Row>
      );
    case "reflector":
      return (
        <Row chip="REFLECT" tone="#7c4ba0">
          {event.learned.length ? (
            <>
              <p className="text-sm font-medium text-navy">{t.learned}</p>
              {event.learned.map((l, i) => (
                <p key={i} className="mt-1 text-xs leading-6 text-[#7c4ba0]">+ {l}</p>
              ))}
            </>
          ) : (
            <p className="text-sm text-steel">{t.noLearn}</p>
          )}
        </Row>
      );
    case "error":
      return <p className="text-sm font-medium text-[#b55233]">{t.error}: {event.message}</p>;
    default:
      return null;
  }
}

function Row({ chip, tone, children }: { chip: string; tone: string; children: React.ReactNode }) {
  return (
    <div className="relative">
      <span
        className="mr-2 inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
        style={{ backgroundColor: tone }}
      >
        {chip}
      </span>
      <div className="mt-1">{children}</div>
    </div>
  );
}
