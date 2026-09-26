# Public sample datasets

Tiny **schema samples**, not full dumps. Used offline by `src/domain/forecast.ts` and `src/domain/align.ts`.

The three files are the correlation triangle. Every row shares **week**, **SKU**, and **region** so they can be joined without inventing a match.

| File | Side | Inspired by | License note |
| --- | --- | --- | --- |
| `roi-sample.csv` | A · influencer activity (views, engagement, post dates, tier) | [Kaggle Influencer Marketing ROI](https://www.kaggle.com/) | Apache-2.0 style public schema; this file is synthetic |
| `comments-sample.csv` | B · social response (comments, mentions, hashtags) | Bright Data / GitHub social samples | Public comment *shape*; invented demo strings, no live scrape |
| `parts-demand-sample.csv` | C · hardware outcome (units, price, campaign window) | [Kaggle Computer Parts Sales](https://www.kaggle.com/) | Sample rows only |

Alignment keys:

- **Temporal:** `week` (ISO) and `post_date`
- **Entity:** `sku` (`4060`, `4070`, `5090`, `ryzen`, `budget-gpu`)
- **Geographic:** `region` (`DACH`, `NORDICS`, `UK`) plus `country` (`DE`, `FI`, …)

Cleaning (see `align.ts`): drop game-only text (Cyberpunk with no GPU), drop viral anomalies (huge views, no hardware, zero sales), and require ≥ 10,000 engagements in Dataset A before a lift is trusted.

Do not replace these with purchased Bright Data extracts or the full Kaggle archives.
