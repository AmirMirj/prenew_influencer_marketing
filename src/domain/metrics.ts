import { averageWeightedInteractions, recencyMultiplier, relativeEngagementRatio } from "./engagement";
import type { Candidate, CreatorTier, Platform, RecentPost } from "./types";

export const ACTIVE_DAYS = 120;

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const URL_RE = /https?:\/\/[^\s<>"')\]]+/g;
const JUNK_EMAIL = /noreply|no-reply|example\.|@sentry|@wix|\.(png|jpe?g|gif|webp)$/i;

const SOCIAL_PATTERNS: Record<string, RegExp> = {
  youtube: /https?:\/\/(?:www\.)?youtube\.com\/(?:@|c\/|channel\/)[\w.\-]+/i,
  tiktok: /https?:\/\/(?:www\.)?tiktok\.com\/@[\w.\-]+/i,
  instagram: /https?:\/\/(?:www\.)?instagram\.com\/[\w.]+\/?/i,
  twitch: /https?:\/\/(?:www\.)?twitch\.tv\/[\w]+/i,
  discord: /https?:\/\/(?:www\.)?discord\.(?:gg|com\/invite)\/[\w\-]+/i,
};

const TYPICAL_RATE: Record<Platform, Record<CreatorTier, number>> = {
  youtube: { nano: 0.045, micro: 0.04, mid: 0.035, macro: 0.03 },
  tiktok: { nano: 0.08, micro: 0.07, mid: 0.06, macro: 0.05 },
  instagram: { nano: 0.045, micro: 0.025, mid: 0.015, macro: 0.01 },
};

const TYPICAL_REACH: Partial<Record<Platform, Record<CreatorTier, number>>> = {
  youtube: { nano: 0.3, micro: 0.2, mid: 0.12, macro: 0.08 },
  tiktok: { nano: 0.6, micro: 0.4, mid: 0.25, macro: 0.15 },
};

const TIERS: Array<[CreatorTier, number, number | null]> = [
  ["nano", 0, 10_000],
  ["micro", 10_000, 50_000],
  ["mid", 50_000, 250_000],
  ["macro", 250_000, null],
];

export function tierOf(followers: number | null | undefined): CreatorTier | undefined {
  if (followers == null) {
    return undefined;
  }
  for (const [key, lo, hi] of TIERS) {
    if (followers >= lo && (hi == null || followers < hi)) {
      return key;
    }
  }
  return undefined;
}

export function vsTypicalScore(ratio: number): number {
  if (ratio <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(100, 50 + 25 * Math.log2(ratio)));
}

export function extractEmails(...texts: Array<string | undefined>): string[] {
  const found: string[] = [];
  for (const text of texts) {
    for (const match of text?.match(EMAIL_RE) ?? []) {
      const email = match.replace(/\.$/, "").toLowerCase();
      if (!found.includes(email) && !JUNK_EMAIL.test(email)) {
        found.push(email);
      }
    }
  }
  return found.slice(0, 3);
}

export function extractSocials(
  ownPlatform: Platform,
  ...texts: Array<string | undefined>
): Record<string, string> {
  const found: Record<string, string> = {};
  for (const text of texts) {
    for (const [network, pattern] of Object.entries(SOCIAL_PATTERNS)) {
      if (network === ownPlatform || found[network]) {
        continue;
      }
      const match = text?.match(pattern);
      if (match) {
        found[network] = match[0].replace(/[\/.,;]+$/, "");
      }
    }
  }
  return found;
}

export function extractLinks(...texts: Array<string | undefined>): string[] {
  const found: string[] = [];
  for (const text of texts) {
    for (const match of text?.match(URL_RE) ?? []) {
      const url = match.replace(/[.,;]+$/, "");
      if (!found.includes(url)) {
        found.push(url);
      }
    }
  }
  return found.slice(0, 8);
}

function parseDate(value: string | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? undefined : dt;
}

function average(values: Array<number | undefined>): number | undefined {
  const nums = values.filter((v): v is number => typeof v === "number" && v >= 0);
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : undefined;
}

function viewsWindow(posts: RecentPost[], now: Date): { window: RecentPost[]; label: string } {
  const dated = posts
    .map((p) => ({ p, d: parseDate(p.date) }))
    .filter((row): row is { p: RecentPost; d: Date } => Boolean(row.d) && row.p.views != null);
  const settled = dated.filter(({ d }) => daysBetween(d, now) >= 2);
  const usable = settled.length ? settled : dated;
  for (const [days, minimum] of [
    [30, 3],
    [90, 2],
  ] as const) {
    const window = usable.filter(({ d }) => daysBetween(d, now) <= days).map(({ p }) => p);
    if (window.length >= minimum) {
      return { window, label: `${days} days` };
    }
  }
  const latest = [...usable].sort((a, b) => b.d.getTime() - a.d.getTime()).slice(0, 10);
  return { window: latest.map(({ p }) => p), label: latest.length ? `last ${latest.length} posts` : "" };
}

function trend(posts: RecentPost[], now: Date): number | undefined {
  const recent: number[] = [];
  const older: number[] = [];
  for (const post of posts) {
    const d = parseDate(post.date);
    if (!d || post.views == null || daysBetween(d, now) < 2) {
      continue;
    }
    const age = daysBetween(d, now);
    if (age <= 30) {
      recent.push(post.views);
    } else if (age <= 90) {
      older.push(post.views);
    }
  }
  const olderAvg = average(older);
  if (recent.length < 2 || older.length < 2 || !olderAvg) {
    return undefined;
  }
  return Math.round(((average(recent) ?? 0) / olderAvg - 1) * 100) / 100;
}

export function trendLabel(value: number | undefined | null): Candidate["trend"] {
  if (value == null) {
    return "";
  }
  return value >= 0.2 ? "Growing" : value <= -0.2 ? "Declining" : "Stable";
}

export function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}

export function compute(creator: Candidate, now: Date = new Date()): Candidate {
  const tier = tierOf(creator.followerCount);
  creator.tier = tier;

  const allPosts = creator.recentPosts ?? [];
  let basis = allPosts;
  if (creator.platform === "youtube") {
    const longForm = allPosts.filter((p) => !p.isShort);
    if (viewsWindow(longForm, now).window.length >= 2) {
      basis = longForm;
    }
  }

  const { window } = viewsWindow(basis, now);
  const avgViews = average(window.map((p) => p.views));
  const avgLikes = average(window.map((p) => p.likes)) ?? average(allPosts.map((p) => p.likes));
  const avgComments =
    average(window.map((p) => p.comments)) ?? average(allPosts.map((p) => p.comments));
  creator.avgViews = avgViews != null ? Math.round(avgViews) : null;
  const viewsTrend = trend(basis, now);
  creator.viewsTrend = viewsTrend ?? null;
  creator.trend = trendLabel(viewsTrend);

  let rate = creator.engagementRate;
  if (creator.platform !== "instagram" && avgViews) {
    rate = ((avgLikes ?? 0) + (avgComments ?? 0)) / avgViews;
    creator.engagementRate = rate;
  } else if (creator.platform === "instagram" && creator.followerCount && (avgLikes || avgComments)) {
    rate = ((avgLikes ?? 0) + (avgComments ?? 0)) / creator.followerCount;
    creator.engagementRate = rate;
  }

  const typicalRate = tier ? TYPICAL_RATE[creator.platform][tier] : undefined;
  const fromPosts = averageWeightedInteractions(allPosts);
  creator.interactionQuality = fromPosts ?? null;
  const relative = relativeEngagementRatio(
    creator.platform,
    creator.followerCount,
    allPosts,
    rate,
    typicalRate,
  );
  creator.relativeEngagement = relative;
  if (fromPosts != null) {
    creator.engagementScore = Math.round(vsTypicalScore(relative));
  } else {
    const ratios: number[] = [];
    if (rate != null && typicalRate) {
      ratios.push(rate / typicalRate);
    }
    if (avgViews != null && creator.followerCount && TYPICAL_REACH[creator.platform] && tier) {
      ratios.push(avgViews / creator.followerCount / TYPICAL_REACH[creator.platform]![tier]);
    }
    if (ratios.length) {
      const vs = Math.exp(ratios.reduce((s, r) => s + Math.log(Math.max(r, 0.01)), 0) / ratios.length);
      creator.engagementScore = Math.round(vsTypicalScore(vs));
    } else {
      creator.engagementScore = 40;
    }
  }

  const dates = allPosts
    .map((p) => parseDate(p.date))
    .filter((d): d is Date => Boolean(d))
    .sort((a, b) => b.getTime() - a.getTime());

  if (dates.length) {
    const daysSince = Math.max(0, daysBetween(dates[0], now));
    const spanDays = dates.length > 1 ? Math.max(7, daysBetween(dates[dates.length - 1], dates[0])) : 30;
    const perMonth = Math.min(60, ((dates.length > 1 ? dates.length - 1 : 1) / spanDays) * 30);
    creator.lastPostAt = dates[0].toISOString();
    creator.daysSinceLastPost = daysSince;
    let recency = 20;
    if (daysSince <= 7) {
      recency = 100;
    } else if (daysSince <= 30) {
      recency = 100 - ((daysSince - 7) * 40) / 23;
    } else if (daysSince <= 90) {
      recency = 60 - ((daysSince - 30) * 40) / 60;
    } else {
      recency = Math.max(0, 20 - ((daysSince - 90) * 20) / 90);
    }
    creator.activityScore = Math.round(0.6 * recency + 0.4 * Math.min(100, (perMonth / 8) * 100));
  } else {
    creator.activityScore = 30;
  }
  creator.recencyMultiplier = recencyMultiplier(creator.daysSinceLastPost);

  const extraTexts = [creator.bio, creator.bioLink, creator.contentSummary, ...(creator.recentTopics ?? [])];
  const extracted = extractEmails(creator.contact.value, ...extraTexts);
  creator.emails = extracted;
  creator.socials = extractSocials(creator.platform, ...extraTexts);
  return creator;
}

export function isInactive(creator: Candidate): boolean {
  return creator.daysSinceLastPost != null && creator.daysSinceLastPost > ACTIVE_DAYS;
}
