# Product spec: Prenew influencer discovery

## Problem

Prenew is a Finnish marketplace for refurbished gaming PCs (Europe, 20+ markets, Espoo + Berlin). Influencer marketing works, but discovery does not scale. Finding partners is still mostly manual scrolling on Instagram, TikTok, and YouTube. That process misses micro- and mid-tier creators who are the best value.

## Goal

A marketing team member can enter a market, language, and niche and get a ranked, outreach-ready shortlist of relevant creators — especially smaller ones — without manual searching.

## Users

Primary user: Prenew marketing / partnerships. They need a list they can act on in the same session.

## Scope

In scope:

- Inputs: market, language, niche/keywords, optional follower band, optional company brief
- Platforms: YouTube, TikTok, Instagram, plus a web-scout source (forums/press finds)
- Local-language query planning (heuristic; optional LLM)
- Fit scoring: niche, market, engagement vs typical for size, activity, brand safety
- Hidden gem badge for small, engaged, on-niche creators
- Outreach: contact (or explicit missing), bilingual pitch, CSV export, client shortlist status
- Demo path: German market + budget / gaming-PC niche
- Stub adapters so the workflow works without live APIs; real YouTube optional

Out of scope:

- Live TikTok or Instagram APIs (Apify)
- Real web-search crawl
- Auth, server database
- Automated sending of outreach

## Brand context

- Product: refurbished gaming PCs
- Positioning: best value-for-money vs new retail; warranty vs risky P2P
- Typical buyer: gamers who want performance without paying new-retail prices
- Geography: Europe; must work in large and small markets
- Relevant niches: gaming, PC building, hardware reviews, budget/value gaming, refurbished/second-hand tech

## Inputs

| Field | Required | Notes |
| --- | --- | --- |
| market | yes | e.g. `DE`, `FI` |
| language | yes | e.g. `de`, `fi`, `en` |
| keywords | yes | e.g. `budget gaming PC` |
| followerBand | no | `micro` (1k–50k), `mid` (50k–250k), `any` |
| companyName | no | default Prenew |
| companyDescription | no | feeds planner and pitch |

## Outputs

Ranked shortlist plus a query plan and step counts. Each item includes:

- Identity, size, language, market, niche tags, games, summary
- Engagement vs typical, activity, average views, views trend
- Fit total and components, why-they-fit, red flags, hidden gem
- Contact (email/handle or missing), other socials
- Bilingual pitch (`local` + `en`)
- `foundVia`: search and/or web

## Success criteria

1. Cuts manual discovery work
2. Surfaces micro/mid creators and labels hidden gems
3. Works in small markets via local-language query expansions
4. Output is exportable and outreach-ready
5. Demoable on DE + budget gaming PC without API keys
