# Internet Business Analysis Copilot

Portfolio web app for demonstrating internet business analysis, KPI decomposition, valuation logic, and AI-assisted research.

## What It Does

- Accepts a company name or ticker such as `PDD`, `BABA`, `UBER`, `NFLX`, or `DASH`
- Fetches a financial snapshot from a configurable provider
- Uses Bocha Search on the server side to gather recent business context
- Uses DeepSeek on the server side to produce a structured business analyst report
- Separates facts from assumptions
- Preserves source URLs for search-backed insights
- Lets the user adjust revenue growth, operating margin, discount rate, and marketing intensity
- Updates valuation output and sensitivity scenarios

## Stack

- Next.js 15
- TypeScript
- Tailwind CSS
- App Router API routes

## Project Structure

- `app/`: pages and API routes
- `components/`: dashboard UI
- `lib/analysis/`: prompt and valuation logic
- `lib/finance/`: financial data provider adapter
- `lib/search/`: Bocha search adapter
- `lib/llm/`: DeepSeek adapter
- `lib/mock-data.ts`: fallback mode when live APIs are not configured

## Environment Variables

Copy `.env.example` to `.env.local` and fill the values you have.

```bash
DEEPSEEK_API_KEY=
BOCHA_API_KEY=
FINANCIAL_DATA_PROVIDER=mock
FINANCIAL_API_KEY=
ENABLE_MOCK_MODE=true
SEARCH_CACHE_TTL_SECONDS=1800
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=12
```

### Supported Financial Provider Modes

- `mock`: uses local mock company data so the app works without any external key
- `yahoo`: uses public Yahoo Finance endpoints for a lightweight live snapshot

If `FINANCIAL_DATA_PROVIDER=yahoo` fails and `ENABLE_MOCK_MODE=true`, the app falls back to mock mode.

## Local Setup

1. Install dependencies

```bash
npm install
```

2. Create local env file

```bash
cp .env.example .env.local
```

3. Start the app

```bash
npm run dev
```

4. Open `http://localhost:3000`

## Deploy To Render

This repo includes a Blueprint file at [render.yaml](C:\Users\Administrator\OneDrive - CUHK-Shenzhen\文档\New project\github repo\render.yaml).

### What Render will create

- One Node web service
- Build command: `npm ci && npm run build`
- Start command: `npx next start -H 0.0.0.0 -p $PORT`

### Before deploying

1. Push this repo to GitHub, GitLab, or Bitbucket
2. Make sure `render.yaml` is committed in the remote repository
3. In Render, fill secret environment variables:
   - `DEEPSEEK_API_KEY`
   - `BOCHA_API_KEY`
   - `FINANCIAL_API_KEY` if you later use a real financial provider

### Recommended first deploy mode

If you want the safest first deploy, keep:

```env
FINANCIAL_DATA_PROVIDER=mock
ENABLE_MOCK_MODE=true
```

That lets the site boot even before live APIs are configured.

### Render Dashboard flow

1. Open Render Dashboard
2. Create a new Blueprint instance from your connected repo
3. Review the generated web service
4. Fill secrets marked `sync: false`
5. Click `Apply`

## Security Notes

- API keys are server-side only
- Bocha and DeepSeek calls happen in backend routes only
- Basic in-memory rate limiting is enabled on `/api/analyze`
- Search results are cached in memory for the configured TTL
- The app stores URLs and snippets, not long copyrighted page content

## Notes On Data Quality

- The app is designed to avoid fabricated numbers
- If a metric is missing from public data, the UI should show `Needs verification`
- Search-backed factual claims should retain source URLs
- Mock mode is intended for demo reliability, not real investment work

## Legacy Prototype

The old Flask prototype remains in `app.py`. It was kept for reference while the main portfolio app was rebuilt in Next.js.
