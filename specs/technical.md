# Technical spec: Prenew influencer discovery

## Stack

- Next.js App Router + TypeScript
- Vitest for unit, contract, workflow, and API tests
- No live network in default `npm test`

## Layout

```
src/
  domain/          # types, scoring — no Next.js imports
  adapters/        # PlatformAdapter + youtube / tiktok / instagram
  workflow/        # discover(): source → score → rank → outreach
  fixtures/        # deterministic stub creators
  outreach/        # contact + suggested pitch
app/
  page.tsx
  api/discover/route.ts
```

## Domain types

```ts
type Platform = "youtube" | "tiktok" | "instagram";
type FollowerBand = "micro" | "mid" | "any";
type ContactStatus = "found" | "missing";

type DiscoverQuery = {
  market: string;       // e.g. "DE"
  language: string;     // e.g. "de"
  keywords: string;
  followerBand?: FollowerBand;
};

type Candidate = {
  id: string;
  platform: Platform;
  handle: string;
  displayName: string;
  profileUrl: string;
  followerCount: number;
  engagementRate: number; // 0–1, e.g. 0.045
  language: string;
  market: string;
  nicheTags: string[];
  contentSummary: string;
  recentTopics: string[];
  contact: {
    status: ContactStatus;
    value?: string; // email, business handle, or profile URL
  };
};

type FitScore = {
  total: number;            // 0–100, weighted
  audienceMatch: number;    // 0–100
  engagementQuality: number;// 0–100
  brandFit: number;         // 0–100
  reasons: string[];        // 1–3 why-they-fit
};

type ShortlistItem = Candidate & {
  fit: FitScore;
  suggestedPitch: string;
};

type Shortlist = {
  query: DiscoverQuery;
  items: ShortlistItem[];   // ranked by fit.total desc
};
```

## Brand context constant

Used by scoring and outreach. Not user-editable in MVP.

```
brand: Prenew
product: refurbished gaming PCs
valueProp: same performance as new retail, roughly 20% cheaper, warranty included, less risk than P2P
relevantNiches: gaming, pc build, hardware review, budget gaming, refurbished, second-hand tech
```

## Scoring (`scoreFit`)

Follower count is **not** a positive ranking signal. It is only used to apply the optional `followerBand` filter before scoring.

Weights (must sum to 1):

- audienceMatch 0.40 — language/market match + keyword/niche overlap with the query
- engagementQuality 0.30 — engagement rate, with a bonus in the micro/mid band (higher engagement expected)
- brandFit 0.30 — overlap with Prenew-relevant niches and topics (gaming, PC hardware, budget/value, refurbished)

`total = round(audienceMatch * 0.40 + engagementQuality * 0.30 + brandFit * 0.30)`

Rules:

- A micro creator (1k–50k) with high engagement and strong niche fit must outrank a mega-account (1M+) with weak niche fit for the same query.
- Language + market match must increase audienceMatch. A DE/de gaming creator scores higher for a DE/de query than an unrelated lifestyle creator in another language.
- `reasons` must mention the concrete signals that drove the score (niche, language, engagement), not follower count.

## Platform adapters

```ts
interface PlatformAdapter {
  readonly platform: Platform;
  search(query: DiscoverQuery): Promise<Candidate[]>;
}
```

- Every adapter (stub or live) implements this interface.
- `search` must not throw on empty results; return `[]`.
- Candidates must have a stable `id` of the form `${platform}:${handle}`.
- Stub adapters filter fixtures by language/market/keywords/followerBand. They do not call the network.
- The real YouTube adapter uses YouTube Data API v3 behind the same interface. Tests mock `fetch`. The API key lives in `YOUTUBE_API_KEY` / `.env.local` and is never committed.

## Workflow (`discover`)

1. Validate query (non-empty market, language, keywords).
2. Call all registered adapters in parallel.
3. Merge candidates, de-dupe by `id`.
4. Filter by `followerBand` if not `any`.
5. Score each candidate with `scoreFit`.
6. Attach `suggestedPitch`.
7. Sort by `fit.total` descending, then by `engagementRate` descending.
8. Return `{ query, items }`.

## Outreach

- If `contact.status === "missing"`, keep it explicit. Do not invent an email.
- If found, `contact.value` is whatever the adapter supplied (email, business handle, or profile URL).
- `suggestedPitch` must:
  - mention Prenew
  - mention refurbished / value / warranty (the value prop)
  - mention the creator’s niche or display name
  - stay under 400 characters

## API

`POST /api/discover`

Request JSON: `DiscoverQuery`

Success: `200` + `Shortlist`

Validation error: `400` + `{ error: string }`

## UI

Single page:

- Form: market, language, keywords, follower band
- Submit calls `POST /api/discover`
- Results table/cards: platform, name/handle, followers, engagement, fit total + reasons, contact, suggested pitch
- Empty state when no matches
- Error state on 400 / network failure

Default form values for the demo: market `DE`, language `de`, keywords `budget gaming PC`, follower band `micro`.

## Test policy

- Spec acceptance titles map 1:1 to test names (see `specs/acceptance.md`).
- No live network in `npm test`.
- YouTube live adapter tests mock `fetch`.
- Domain and workflow tests must not import Next.js.
