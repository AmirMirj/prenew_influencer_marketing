import { PRENEW_BRAND } from "./brand";
import { applyFitModifiers, isHiddenGem, isPassiveMega, recencyMultiplier } from "./engagement";
import { compute } from "./metrics";
import type { Candidate, DiscoverQuery, FitScore } from "./types";

const WEIGHTS = {
  nicheFit: 0.4,
  marketFit: 0.2,
  engagementQuality: 0.25,
  activity: 0.1,
  brandSafety: 0.05,
} as const;

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "for",
  "of",
  "to",
  "in",
  "on",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9äöüßàâéèêëïîôùûç-]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
}

export function haystackOf(candidate: Candidate): string {
  return [
    candidate.displayName,
    candidate.handle,
    candidate.contentSummary,
    candidate.bio ?? "",
    ...(candidate.nicheTags ?? []),
    ...(candidate.recentTopics ?? []),
    ...(candidate.games ?? []),
    ...(candidate.recentPosts ?? []).map((post) => post.text ?? ""),
  ]
    .join(" ")
    .toLowerCase();
}

export function scoreFit(candidate: Candidate, query: DiscoverQuery): FitScore {
  const scored = compute({ ...candidate, recentPosts: candidate.recentPosts?.map((p) => ({ ...p })) });
  const marketFit = scoreMarketFit(scored, query);
  const nicheFit = scoreNicheFit(scored);
  const recency = scored.recencyMultiplier ?? recencyMultiplier(scored.daysSinceLastPost);
  const engagementQuality = Math.round(
    Math.max(0, Math.min(100, (scored.engagementScore ?? 40) * recency)),
  );
  const activity = scored.activityScore ?? 30;
  const { brandSafety, redFlags, competitorSponsor } = scoreSafety(scored);
  const hiddenGem = isHiddenGem(scored.followerCount, engagementQuality, nicheFit);
  const relativeEngagement = scored.relativeEngagement ?? null;
  const passiveMega = isPassiveMega(scored.followerCount, relativeEngagement, engagementQuality);
  const total = applyFitModifiers(
    Math.round(
      nicheFit * WEIGHTS.nicheFit +
        marketFit * WEIGHTS.marketFit +
        engagementQuality * WEIGHTS.engagementQuality +
        activity * WEIGHTS.activity +
        brandSafety * WEIGHTS.brandSafety,
    ),
    { hiddenGem, penalize: competitorSponsor || brandSafety < 50, passiveMega },
  );

  return {
    total,
    audienceMatch: marketFit,
    marketFit,
    nicheFit,
    brandFit: nicheFit,
    engagementQuality,
    activity,
    brandSafety,
    reasons: buildReasons(scored, query, {
      marketFit,
      nicheFit,
      engagementQuality,
      relativeEngagement,
    }),
    hiddenGem,
    redFlags,
    competitorSponsor,
    relativeEngagement,
  };
}

function scoreMarketFit(candidate: Candidate, query: DiscoverQuery): number {
  let score = 0;
  if (candidate.language.toLowerCase() === query.language.toLowerCase()) {
    score += 40;
  }
  if (candidate.market.toUpperCase() === query.market.toUpperCase()) {
    score += 30;
  }
  const tokens = tokenize(query.keywords);
  if (tokens.length > 0) {
    const haystack = haystackOf(candidate);
    const hits = tokens.filter((token) => haystack.includes(token));
    score += Math.round(30 * (hits.length / tokens.length));
  }
  return Math.min(100, score);
}

function scoreNicheFit(candidate: Candidate): number {
  const haystack = haystackOf(candidate);
  const hits = PRENEW_BRAND.relevantTokens.filter((token) => haystack.includes(token));
  return Math.min(100, Math.round((hits.length / 6) * 100));
}

function scoreSafety(candidate: Candidate): {
  brandSafety: number;
  redFlags: string[];
  competitorSponsor: boolean;
} {
  const haystack = haystackOf(candidate);
  const redFlags: string[] = PRENEW_BRAND.safetyFlags.filter((flag) => haystack.includes(flag));
  const competitorSponsor = PRENEW_BRAND.competitors.some((name) => haystack.includes(name));
  if (competitorSponsor) {
    redFlags.push("competitor sponsor");
  }
  let brandSafety = 100;
  if (redFlags.length) {
    brandSafety = Math.max(20, 100 - redFlags.length * 30);
  }
  if (competitorSponsor) {
    brandSafety = Math.min(brandSafety, 45);
  }
  return { brandSafety, redFlags, competitorSponsor };
}

function buildReasons(
  candidate: Candidate,
  query: DiscoverQuery,
  scores: Pick<FitScore, "marketFit" | "nicheFit" | "engagementQuality" | "relativeEngagement">,
): string[] {
  const reasons: string[] = [];
  if (scores.nicheFit >= 40) {
    const niche = candidate.nicheTags[0] ?? "gaming";
    reasons.push(`Creates ${niche} content that matches Prenew’s refurbished-PC audience`);
  }
  if (candidate.language.toLowerCase() === query.language.toLowerCase()) {
    reasons.push(`Publishes in ${candidate.language}, matching the ${query.market} brief`);
  }
  if (scores.relativeEngagement != null && scores.relativeEngagement >= 1.5) {
    reasons.push(
      `Community interaction is ${scores.relativeEngagement.toFixed(1)}× typical for this size`,
    );
  } else if (scores.engagementQuality >= 40) {
    const topic = candidate.nicheTags[0] ?? "channel";
    reasons.push(`Engagement is strong vs typical ${candidate.tier ?? "size"} ${topic} accounts`);
  }
  if (reasons.length === 0) {
    reasons.push("Limited overlap with the brief; ranked for completeness only");
  }
  return reasons.slice(0, 3);
}
