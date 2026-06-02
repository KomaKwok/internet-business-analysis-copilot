export const appConfig = {
  deepseekApiKey: process.env.DEEPSEEK_API_KEY || "",
  bochaApiKey: process.env.BOCHA_API_KEY || "",
  financialApiKey: process.env.FINANCIAL_API_KEY || "",
  financialDataProvider: process.env.FINANCIAL_DATA_PROVIDER || "mock",
  enableMockMode: (process.env.ENABLE_MOCK_MODE || "true").toLowerCase() === "true",
  searchCacheTtlSeconds: Number(process.env.SEARCH_CACHE_TTL_SECONDS || 1800),
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
  rateLimitMaxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS || 12)
};
