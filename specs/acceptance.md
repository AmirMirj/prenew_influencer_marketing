# Acceptance spec

Test titles must match these names 1:1.

## Scoring

### A1. micro-creator with high engagement outranks a mega-account with weak niche fit

Given a DE / de / "budget gaming PC" query  
And a micro YouTube creator (12k subs, 6% engagement, gaming + PC build tags, German)  
And a mega YouTube creator (2M subs, 1% engagement, lifestyle tags, English)  
When both are scored  
Then the micro creator’s `fit.total` is higher than the mega creator’s  
And neither `reasons` array mentions follower count

### A2. German-language gaming content scores higher for a DE query than unrelated lifestyle content

Given a DE / de / "budget gaming PC" query  
And a German gaming creator  
And an English lifestyle creator  
When both are scored  
Then the German gaming creator’s `audienceMatch` and `fit.total` are higher

## Adapters

### A3. every platform adapter satisfies the shared search contract

Given YouTube, TikTok, and Instagram adapters  
When `search` is called with a valid query  
Then each returns an array of candidates  
And every candidate `id` matches `${platform}:${handle}`  
And every candidate `platform` matches the adapter  
And `search` returns `[]` rather than throwing when nothing matches

### A4. stub adapters filter by market, language, keywords, and follower band

Given the fixture catalog  
When a stub searches DE / de / "gaming" / micro  
Then results only include DE + de + gaming-related + 1k–50k creators  
And a query with no matching fixtures returns `[]`

## Workflow

### A5. discover merges all platforms and ranks by fit

Given stub adapters that each return at least one matching candidate  
When `discover` is called with DE / de / "budget gaming PC"  
Then the shortlist includes YouTube, TikTok, and Instagram items  
And items are sorted by `fit.total` descending  
And each item has `fit` and `suggestedPitch`

### A6. discover returns an empty shortlist when no adapters match

Given a query that matches no fixtures  
When `discover` is called  
Then `items` is `[]`  
And the response still echoes the query

### A7. discover rejects an incomplete query

Given a query missing market, language, or keywords  
When `discover` is called  
Then it throws a validation error (or the API returns 400)

## Outreach

### A8. suggested pitch mentions Prenew, the value prop, and the creator

Given a scored gaming creator  
When outreach is generated  
Then `suggestedPitch` includes "Prenew"  
And it mentions refurbished, value, or warranty  
And it mentions the creator’s display name or a niche tag  
And it is at most 400 characters

### A9. missing contact stays explicit

Given a candidate whose adapter did not supply contact  
When the shortlist item is built  
Then `contact.status` is `"missing"`  
And no email is invented

## API / UI

### A10. POST /api/discover returns a ranked shortlist

Given a valid DE / de / "budget gaming PC" body  
When the API is called  
Then the status is 200  
And the body is a shortlist with ranked items

### A11. POST /api/discover returns 400 for an invalid body

Given a body missing keywords  
When the API is called  
Then the status is 400  
And the body has an `error` string

## YouTube live adapter

### A12. YouTube adapter maps Data API results onto Candidate without calling the network in tests

Given a mocked YouTube Data API search + channels response  
When the YouTube adapter searches  
Then candidates are mapped to the shared `Candidate` shape  
And `fetch` is called with the YouTube API host  
And no real network request is made
