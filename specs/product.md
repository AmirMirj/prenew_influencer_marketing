# Product spec: Prenew influencer discovery

## Problem

Prenew is a Finnish marketplace for refurbished gaming PCs (Europe, 20+ markets, Espoo + Berlin). Influencer marketing works, but discovery does not scale. Finding partners is still mostly manual scrolling on Instagram, TikTok, and YouTube. That process misses micro- and mid-tier creators who are the best value.

## Goal

A marketing team member can enter a market, language, and niche and get a ranked, outreach-ready shortlist of relevant creators — especially smaller ones — without manual searching.

## Users

Primary user: Prenew marketing / partnerships. They need a list they can act on in the same session.

## Scope (MVP)

In scope:

- Inputs: market, language, niche/keywords, optional follower band (micro / mid / any)
- Platforms: YouTube, TikTok, Instagram
- Fit scoring beyond follower count
- Outreach-ready fields: contact (or explicit missing), suggested pitch, why-they-fit
- Demo path: German market + budget / gaming-PC niche
- Stub adapters first so the workflow works without live APIs; real YouTube later

Out of scope for this MVP:

- Live TikTok or Instagram APIs
- Real email-finding or scraping pipelines
- Auth, persistence, database
- Automated sending of outreach

## Brand context (used for scoring and pitches)

- Product: refurbished gaming PCs
- Positioning: best value-for-money vs new retail; warranty vs risky P2P
- Typical buyer: gamers who want performance without paying new-retail prices
- Geography: Europe; must work in large and small markets
- Relevant creator niches: gaming, PC building, hardware reviews, budget/value gaming, refurbished/second-hand tech, country-specific gaming communities

## Inputs

| Field | Required | Notes |
| --- | --- | --- |
| market | yes | ISO-like country code, e.g. `DE`, `FI`, `FR` |
| language | yes | ISO 639-1, e.g. `de`, `fi`, `en` |
| keywords | yes | Niche / content keywords, e.g. `budget gaming PC` |
| followerBand | no | `micro` (1k–50k), `mid` (50k–250k), `any` (default) |

## Outputs

A ranked shortlist. Each item includes:

- Identity: platform, handle, display name, profile URL
- Size: follower/subscriber count, engagement rate
- Language and inferred market
- Niche tags and a short content summary
- Fit score (0–100) with component scores: audience match, engagement quality, brand fit
- Why-they-fit: 1–3 short reasons
- Contact: handle/email/url, or an explicit `missing` status
- Suggested pitch tailored to the creator and Prenew’s value prop

## Success criteria

1. Meaningfully cuts manual discovery work
2. Surfaces micro/mid creators, not only mega-accounts
3. Works for small markets (language + market on the query)
4. Output is immediately usable by a marketing team
5. Demonstrable on a real example (DE + budget gaming PC)

## Non-goals

- Replacing a full influencer platform (payments, contracts, campaign tracking)
- Ranking by follower count alone
