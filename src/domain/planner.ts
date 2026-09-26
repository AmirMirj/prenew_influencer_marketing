import { nicheById, nicheByKeywords } from "./niches";
import type { DiscoverQuery, QueryPlan } from "./types";

const DE_EXPANSIONS = ["Preis-Leistung", "gebraucht gaming PC", "gebraucht GPU"];
const FI_EXPANSIONS = ["pelikone", "käytetty näytönohjain", "kunnostettu"];

export function planSearches(query: DiscoverQuery): QueryPlan {
  const expansions = expansionsFor(query);
  const terms = uniqueTerms([query.keywords, ...expansions]);
  return {
    original: query.keywords,
    expansions,
    terms,
  };
}

export function mergePlan(base: QueryPlan, extras: string[]): QueryPlan {
  const expansions = uniqueTerms([...base.expansions, ...extras]);
  return {
    original: base.original,
    expansions,
    terms: uniqueTerms([base.original, ...expansions]),
  };
}

export function expansionsFor(query: DiscoverQuery): string[] {
  const market = query.market.toUpperCase();
  const language = query.language.toLowerCase();
  const local =
    market === "DE" || language === "de"
      ? DE_EXPANSIONS
      : market === "FI" || language === "fi"
        ? FI_EXPANSIONS
        : [];
  const niche = nicheById(query.niche) ?? nicheByKeywords(query.keywords);
  return uniqueTerms([...local, ...(niche?.extraTerms ?? [])]);
}

function uniqueTerms(parts: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed && !seen.has(trimmed.toLowerCase())) {
      seen.add(trimmed.toLowerCase());
      out.push(trimmed);
    }
  }
  return out;
}
