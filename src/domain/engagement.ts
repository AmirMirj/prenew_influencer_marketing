import type { Candidate, CreatorTier, Platform, RecentPost } from "./types";

export const LAST_POSTS = 10;
export const HIDDEN_GEM_FOLLOWERS = 50_000;
export const HIDDEN_GEM_ENGAGEMENT = 65;
export const HIDDEN_GEM_NICHE = 75;
export const HIDDEN_GEM_BONUS = 8;
export const SAFETY_PENALTY = 15;
export const MEGA_FOLLOWERS = 250_000;
export const MEGA_PENALTY = 8;

/** Comments and shares beat a passive like for a high-consideration PC buy. */
export const INTERACTION_WEIGHTS = {
  comments: 4,
  shares: 3.5,
  saves: 3,
  likes: 1,
} as const;

const TIER_ANCHORS: Array<{ tier: CreatorTier; followers: number }> = [
  { tier: "nano", followers: 5_000 },
  { tier: "micro", followers: 25_000 },
  { tier: "mid", followers: 120_000 },
  { tier: "macro", followers: 800_000 },
];

/** Typical weighted interactions per post at each size anchor. */
const EXPECTED_WEIGHTED: Record<Platform, Record<CreatorTier, number>> = {
  youtube: { nano: 120, micro: 350, mid: 1_500, macro: 8_000 },
  tiktok: { nano: 600, micro: 2_000, mid: 6_500, macro: 20_000 },
  instagram: { nano: 100, micro: 280, mid: 700, macro: 2_500 },
};

export function weightedInteractions(post: Pick<RecentPost, "likes" | "comments" | "shares" | "saves">): number {
  return (
    INTERACTION_WEIGHTS.comments * (post.comments ?? 0) +
    INTERACTION_WEIGHTS.shares * (post.shares ?? 0) +
    INTERACTION_WEIGHTS.saves * (post.saves ?? 0) +
    INTERACTION_WEIGHTS.likes * (post.likes ?? 0)
  );
}

export function lastPosts(posts: RecentPost[] | undefined, limit = LAST_POSTS): RecentPost[] {
  if (!posts?.length) {
    return [];
  }
  return [...posts]
    .sort((a, b) => (Date.parse(b.date ?? "") || 0) - (Date.parse(a.date ?? "") || 0))
    .slice(0, limit);
}

export function expectedInteractions(platform: Platform, followers: number): number {
  const curve = EXPECTED_WEIGHTED[platform];
  const size = Math.max(followers, 1);
  const first = TIER_ANCHORS[0];
  if (size <= first.followers) {
    return Math.max(1, curve[first.tier] * (size / first.followers));
  }
  for (let index = 0; index < TIER_ANCHORS.length - 1; index += 1) {
    const low = TIER_ANCHORS[index];
    const high = TIER_ANCHORS[index + 1];
    if (size <= high.followers) {
      const t =
        (Math.log(size) - Math.log(low.followers)) / (Math.log(high.followers) - Math.log(low.followers));
      return curve[low.tier] + t * (curve[high.tier] - curve[low.tier]);
    }
  }
  return curve.macro;
}

export function averageWeightedInteractions(posts: RecentPost[] | undefined): number | undefined {
  const qualities = lastPosts(posts)
    .map((post) => weightedInteractions(post))
    .filter((value) => value > 0);
  if (!qualities.length) {
    return undefined;
  }
  return qualities.reduce((sum, value) => sum + value, 0) / qualities.length;
}

export function relativeEngagementRatio(
  platform: Platform,
  followers: number,
  posts: RecentPost[] | undefined,
  fallbackRate?: number,
  typicalRate?: number,
): number {
  const avg = averageWeightedInteractions(posts);
  if (avg != null && followers > 0) {
    const expected = expectedInteractions(platform, followers);
    return expected > 0 ? avg / expected : 0;
  }
  if (fallbackRate != null && typicalRate && typicalRate > 0) {
    return fallbackRate / typicalRate;
  }
  return 0;
}

/** Weekly posters keep 1.0. Unknown last-post dates are not punished. */
export function recencyMultiplier(daysSinceLastPost: number | undefined): number {
  if (daysSinceLastPost == null) {
    return 1;
  }
  if (daysSinceLastPost <= 7) {
    return 1;
  }
  if (daysSinceLastPost <= 30) {
    return 1 - ((daysSinceLastPost - 7) * 0.15) / 23;
  }
  if (daysSinceLastPost <= 90) {
    return 0.85 - ((daysSinceLastPost - 30) * 0.2) / 60;
  }
  return Math.max(0.5, 0.65 - ((daysSinceLastPost - 90) * 0.15) / 30);
}

export function isHiddenGem(followers: number, engagementQuality: number, nicheFit: number): boolean {
  return followers < HIDDEN_GEM_FOLLOWERS && engagementQuality >= HIDDEN_GEM_ENGAGEMENT && nicheFit >= HIDDEN_GEM_NICHE;
}

export function isPassiveMega(
  followers: number,
  relativeEngagement: number | null | undefined,
  engagementQuality: number,
): boolean {
  if (followers < MEGA_FOLLOWERS) {
    return false;
  }
  if (relativeEngagement != null) {
    return relativeEngagement < 1;
  }
  return engagementQuality < 50;
}

export function applyFitModifiers(
  base: number,
  options: { hiddenGem: boolean; penalize: boolean; passiveMega?: boolean },
): number {
  let total = base;
  if (options.penalize) {
    total -= SAFETY_PENALTY;
  }
  if (options.passiveMega) {
    total -= MEGA_PENALTY;
  }
  if (options.hiddenGem) {
    total += HIDDEN_GEM_BONUS;
  }
  return Math.max(0, Math.min(100, total));
}
