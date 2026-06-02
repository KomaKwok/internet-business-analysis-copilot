import { generateCompanyAnalysis } from "@/lib/analysis/company-analysis";
import { Locale } from "@/components/language-provider";
import { appConfig } from "@/lib/config";
import { checkRateLimit } from "@/lib/rate-limit";
import { normalizeTicker } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "local";
  const limit = checkRateLimit(ip, appConfig.rateLimitWindowMs, appConfig.rateLimitMaxRequests);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait before running another analysis." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const query = normalizeTicker(body.query || "");
    if (!query) {
      return NextResponse.json({ error: "Company name or ticker is required." }, { status: 400 });
    }

    const analysis = await generateCompanyAnalysis({
      query,
      locale: body.locale === "zh" ? ("zh" as Locale) : ("en" as Locale),
      competitors: Array.isArray(body.competitors)
        ? body.competitors.filter((item: unknown) => typeof item === "string")
        : [],
      assumptions: {
        revenueGrowth: Number(body.assumptions?.revenueGrowth ?? 0.18),
        operatingMargin: Number(body.assumptions?.operatingMargin ?? 0.16),
        discountRate: Number(body.assumptions?.discountRate ?? 0.1),
        terminalGrowth: Number(body.assumptions?.terminalGrowth ?? 0.03),
        userGrowth: Number(body.assumptions?.userGrowth ?? 0.12),
        arpuGrowth: Number(body.assumptions?.arpuGrowth ?? 0.05),
        takeRateChange: Number(body.assumptions?.takeRateChange ?? 0.01),
        marketingExpenseRatio: Number(body.assumptions?.marketingExpenseRatio ?? 0.18)
      }
    });

    return NextResponse.json(analysis);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown error while generating company analysis."
      },
      { status: 500 }
    );
  }
}
