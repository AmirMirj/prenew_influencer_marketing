import type { Platform, Shortlist, ShortlistItem } from "@/src/domain/types";
import { isEmail } from "./labels";

export type CountRow = {
  id: string;
  label: string;
  count: number;
};

export type ShortlistStats = {
  creators: number;
  gems: number;
  emails: number;
  flags: number;
  webFinds: number;
  growing: number;
  avgFit: number;
  medianFollowers: number;
  avgEngagement: number;
  platforms: CountRow[];
  funnel: CountRow[];
};

const PLATFORM_LABEL: Record<Platform, string> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  instagram: "Instagram",
};

export function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function compactNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${trimDecimal(value / 1_000_000)}M`;
  }
  if (value >= 1_000) {
    return `${trimDecimal(value / 1_000)}k`;
  }
  return String(Math.round(value));
}

export function percentLabel(ratio: number, digits = 1): string {
  return `${(ratio * 100).toFixed(digits)}%`;
}

export function sparklinePath(values: number[], width = 160, height = 36, pad = 3): string {
  if (values.length === 0) {
    return "";
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  return values
    .map((value, index) => {
      const x = pad + (values.length === 1 ? innerW / 2 : (index / (values.length - 1)) * innerW);
      const y = pad + innerH - ((value - min) / span) * innerH;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export function postSeries(item: Pick<ShortlistItem, "recentPosts">): number[] {
  return (item.recentPosts ?? [])
    .map((post) => post.views ?? post.likes ?? 0)
    .filter((value) => value > 0)
    .reverse();
}

export function computeShortlistStats(shortlist: Shortlist): ShortlistStats {
  const items = shortlist.items;
  const platforms: CountRow[] = (["youtube", "tiktok", "instagram"] as Platform[]).map((id) => ({
    id,
    label: PLATFORM_LABEL[id],
    count: items.filter((item) => item.platform === id).length,
  }));

  return {
    creators: items.length,
    gems: items.filter((item) => item.fit.hiddenGem).length,
    emails: items.filter((item) => isEmail(item.contact.value)).length,
    flags: items.filter((item) => item.fit.competitorSponsor || item.fit.redFlags.length > 0).length,
    webFinds: items.filter((item) => item.foundVia?.includes("web")).length,
    growing: items.filter((item) => item.trend === "Growing").length,
    avgFit: Math.round(average(items.map((item) => item.fit.total))),
    medianFollowers: Math.round(median(items.map((item) => item.followerCount))),
    avgEngagement: average(items.map((item) => item.engagementRate)),
    platforms,
    funnel: [
      { id: "sourced", label: "Found", count: shortlist.steps.sourced },
      { id: "filtered", label: "Active", count: shortlist.steps.filtered },
      { id: "scored", label: "Ranked", count: shortlist.steps.scored },
    ],
  };
}

function trimDecimal(value: number): string {
  return value.toFixed(1).replace(/\.0$/, "");
}
