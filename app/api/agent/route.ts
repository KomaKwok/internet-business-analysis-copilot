import { orchestrate, AgentEvent } from "@/lib/agent/orchestrator";
import { Locale } from "@/components/language-provider";
import { appConfig } from "@/lib/config";
import { checkRateLimit } from "@/lib/rate-limit";
import { normalizeTicker } from "@/lib/utils";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "local";
  const limit = checkRateLimit(`agent:${ip}`, appConfig.rateLimitWindowMs, 4);
  if (!limit.allowed) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429 });
  }

  const body = await request.json();
  const ticker = normalizeTicker(body.query || "");
  const locale: Locale = body.locale === "zh" ? "zh" : "en";

  if (!ticker) {
    return new Response(JSON.stringify({ error: "Ticker required." }), { status: 400 });
  }
  if (!appConfig.deepseekApiKey || !appConfig.bochaApiKey) {
    return new Response(JSON.stringify({ error: "Agent mode needs DeepSeek and Bocha API keys." }), {
      status: 400
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: AgentEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };
      try {
        await orchestrate(ticker, locale, emit);
      } catch (error) {
        emit({ type: "error", message: error instanceof Error ? error.message : "Agent run failed" });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform"
    }
  });
}
