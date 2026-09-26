# Technical spec: Prenew influencer discovery

## Stack

- Next.js App Router + TypeScript
- Vitest for unit, contract, workflow, and API tests
- No live network in default `npm test`
- Optional `OPENAI_API_KEY` / `OPENAI_BASE_URL` for planning, safety copy, and local pitch
- Optional `YOUTUBE_API_KEY` for live YouTube (including recent videos)

## Layout

```
src/
  domain/          # types, metrics, scoring, planner
  adapters/        # PlatformAdapter + youtube / tiktok / instagram / web
  workflow/        # discover()
  fixtures/
  outreach/        # contact, bilingual pitch, csv
  llm/             # optional OpenAI-compatible client
app/
  page.tsx
  api/discover/route.ts
```

## Domain types (extensions)

```ts
type SourceId = Platform | "web";
type FoundVia = "search" | "web";

type RecentPost = {
  date: string;
  views?: number;
  likes?: number;
  comments?: number;
  isShort?: boolean;
  text?: string;
};

type SuggestedPitch = {
  local: string;
  en: string;
  language: string;
};

type QueryPlan = {
  original: string;
  expansions: string[];
  terms: string[];
};

type DiscoverQuery = {
  market: string;
  language: string;
  keywords: string;
  followerBand?: FollowerBand;
  companyName?: string;
  companyDescription?: string;
};

type FitScore = {
  total: number;
  audienceMatch: number; // alias of marketFit
  marketFit: number;
  nicheFit: number;
  brandFit: number; // alias of nicheFit
  engagementQuality: number;
  activity: number;
  brandSafety: number;
  reasons: string[];
  hiddenGem: boolean;
  redFlags: string[];
  competitorSponsor: boolean;
};
```

`suggestedPitch` on a shortlist item is `SuggestedPitch`. Unknown activity fields are omitted; creators are not dropped for missing `lastPostAt`.

## Scoring

Follower count is not a positive ranking signal.

Weights:

- nicheFit 0.40
- marketFit 0.20
- engagementQuality (vs typical for platform + tier) 0.25
- activity 0.10
- brandSafety 0.05

Penalties: −15 if competitor sponsor or brandSafety < 50. Clamp total to 0–100.

Hidden gem: followers < 50k AND engagementQuality >= 65 AND nicheFit >= 75.

A1/A2 still hold: a German micro gaming creator outranks an English mega lifestyle account.

## Metrics

- Tiers: nano <10k, micro <50k, mid <250k, else macro
- Engagement vs typical on a log scale (1× typical → 50)
- Activity from `recentPosts` (recency + posts/month)
- Views window 30 days (else 90); skip posts younger than 2 days; prefer long-form on YouTube
- Email extractor ignores noreply / image filenames
- Inactive filter: drop only when `daysSinceLastPost` is known and > 120

## Planner

Heuristic expansions for DE and FI (e.g. Preis-Leistung, gebraucht, pelikone, käytetty). Optional LLM replaces expansions when a key is set. Adapters receive the joined term list.

## Adapters

`PlatformAdapter.platform` is `SourceId`. Social stubs filter fixtures. `webScoutStub` uses `platform: "web"` and returns creators with a real social `candidate.platform` and `foundVia: ["web"]`.

Live YouTube may call `videos`/`search` for recent uploads. If that fails, return the channel without posts (do not mark inactive).

## Outreach

- Never invent an email
- Pitch `en` always; `local` uses `de` or `fi` templates, otherwise English
- Each pitch string ≤ 400 chars and mentions Prenew + value prop + creator
- CSV columns: handle, platform, market, followers, fit, hiddenGem, contact, pitch en

## API / UI

`POST /api/discover` → `{ query, plan, steps, items }`.

UI: Prenew company strip (localStorage), suggested searches, query plan, sort/filter, gem badge, pitch toggle, statuses, CSV download.

Default brief: DE / de / budget gaming PC / micro.
