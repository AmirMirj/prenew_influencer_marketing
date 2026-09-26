import {
  loadCommentSample,
  loadPartsSample,
  loadRoiSample,
  type CommentRow,
  type PartsRow,
  type RoiRow,
} from "@/src/data/samples";
import type { Candidate } from "./types";

export const INTERACTION_FLOOR = 10_000;

export type Region = "DACH" | "NORDICS" | "UK" | "OTHER";
export type AlignKey = {
  week: string;
  sku: string;
  region: Region;
};

export type Alignment = {
  key?: AlignKey;
  temporalAnchor: boolean;
  entityId?: string;
  region?: Region;
  matchedSides: number;
  interactionVolume: number;
  volumeOk: boolean;
  gameNoiseFiltered: number;
  viralOutlier: boolean;
};

const HARDWARE_TOKENS = [
  "rtx",
  "gtx",
  "gpu",
  "4060",
  "4070",
  "4090",
  "5090",
  "ryzen",
  "radeon",
  "refurbished",
  "gebraucht",
  "kunnostettu",
  "nvme",
  "ddr",
  "budget gpu",
  "budget-gpu",
];

const GAME_TOKENS = [
  "cyberpunk",
  "valorant",
  "world of tanks",
  "baldur",
  "fortnite",
  "cs2",
  "night city",
  "wargaming",
];

const GPU_SKUS = new Set(["4060", "4070", "4090", "5090", "budget-gpu"]);

export function isoWeek(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function regionOf(market?: string): Region {
  const code = (market ?? "").toUpperCase();
  if (["DE", "AT", "CH", "DACH"].includes(code)) {
    return "DACH";
  }
  if (["FI", "SE", "NO", "DK", "NORDICS"].includes(code)) {
    return "NORDICS";
  }
  if (["UK", "GB", "IE"].includes(code)) {
    return "UK";
  }
  return "OTHER";
}

export function skusOf(text: string): string[] {
  const haystack = text.toLowerCase();
  const found: string[] = [];
  for (const sku of ["5090", "4090", "4070", "4060"]) {
    if (haystack.includes(sku)) {
      found.push(sku);
    }
  }
  if (/ryzen|9950|5600/.test(haystack)) {
    found.push("ryzen");
  }
  if (/budget gpu|budget-gpu|budget build|budgetbuild/.test(haystack)) {
    found.push("budget-gpu");
  }
  return [...new Set(found)];
}

export function isHardwareSignal(text: string): boolean {
  const haystack = text.toLowerCase();
  return HARDWARE_TOKENS.some((token) => haystack.includes(token));
}

export function isGameOnly(text: string): boolean {
  const haystack = text.toLowerCase();
  const game = GAME_TOKENS.some((token) => haystack.includes(token));
  return game && !isHardwareSignal(haystack);
}

export function isViralAnomaly(input: {
  views?: number | null;
  sku?: string;
  attributed_sales?: number;
  text?: string;
}): boolean {
  const views = input.views ?? 0;
  const hardware = Boolean(input.sku) || isHardwareSignal(input.text ?? "");
  const sales = input.attributed_sales ?? 0;
  return views >= 250_000 && !hardware && sales <= 0;
}

export function interactionVolume(activity: RoiRow[] = loadRoiSample()): number {
  return activity.reduce((sum, row) => sum + (row.engagements || 0), 0);
}

export function alignKeyOf(week: string, sku: string, region: Region): string {
  return `${week}|${sku}|${region}`;
}

export function indexByKey<T extends { week?: string; sku?: string; region?: string }>(
  rows: T[],
): Map<string, T[]> {
  const index = new Map<string, T[]>();
  for (const row of rows) {
    if (!row.week || !row.sku || !row.region) {
      continue;
    }
    const key = alignKeyOf(row.week, row.sku, row.region as Region);
    const list = index.get(key) ?? [];
    list.push(row);
    index.set(key, list);
  }
  return index;
}

export function cleanComments(rows: CommentRow[] = loadCommentSample()): CommentRow[] {
  return rows.filter((row) => !isGameOnly(`${row.hashtags} ${row.text}`));
}

export function cleanActivity(rows: RoiRow[] = loadRoiSample()): RoiRow[] {
  return rows.filter((row) => !isViralAnomaly(row));
}

export function alignCandidate(
  candidate: Candidate,
  activity: RoiRow[] = loadRoiSample(),
  social: CommentRow[] = loadCommentSample(),
  demand: PartsRow[] = loadPartsSample(),
): Alignment {
  const region = regionOf(candidate.market);
  const entityText = [
    candidate.hardware?.gpu,
    candidate.hardware?.cpu,
    candidate.contentSummary,
    ...(candidate.recentTopics ?? []),
    ...(candidate.nicheTags ?? []),
    ...(candidate.recentPosts ?? []).map((post) => post.text ?? ""),
  ]
    .filter(Boolean)
    .join(" ");
  const skus = skusOf(entityText);
  const weeks = (candidate.recentPosts ?? [])
    .map((post) => isoWeek(post.date))
    .filter(Boolean);
  const activityClean = cleanActivity(activity);
  const socialClean = cleanComments(social);
  const a = indexByKey(activityClean);
  const b = indexByKey(socialClean);
  const c = indexByKey(demand);

  let key: AlignKey | undefined;
  let temporalAnchor = false;
  let matchedSides = 0;

  for (const sku of skus) {
    for (const week of weeks) {
      const triple = { week, sku, region };
      const id = alignKeyOf(week, sku, region);
      const sides = [a.has(id), b.has(id), c.has(id)].filter(Boolean).length;
      if (sides === 3) {
        key = triple;
        temporalAnchor = true;
        matchedSides = 3;
        break;
      }
      if (sides > matchedSides) {
        key = triple;
        temporalAnchor = sides >= 2;
        matchedSides = sides;
      }
    }
    if (matchedSides === 3) {
      break;
    }
  }

  if (!key && skus[0]) {
    const entityMatch = demand.find((row) => row.sku === skus[0] && row.region === region);
    if (entityMatch?.week) {
      key = { week: entityMatch.week, sku: skus[0], region };
      matchedSides = 2;
    }
  }

  const gameNoiseFiltered = social.filter((row) => isGameOnly(`${row.hashtags} ${row.text}`)).length;
  const views = candidate.avgViews ?? average(candidate.recentPosts?.map((post) => post.views ?? 0) ?? []);
  const viralOutlier = isViralAnomaly({
    views,
    sku: skus[0],
    text: entityText,
  });

  return {
    key,
    temporalAnchor,
    entityId: key?.sku ?? skus[0],
    region,
    matchedSides,
    interactionVolume: interactionVolume(activityClean),
    volumeOk: interactionVolume(activityClean) >= INTERACTION_FLOOR,
    gameNoiseFiltered,
    viralOutlier,
  };
}

export function alignedDemandLift(
  alignment: Alignment,
  demand: PartsRow[] = loadPartsSample(),
): number | undefined {
  if (!alignment.entityId || alignment.viralOutlier || !alignment.volumeOk) {
    return undefined;
  }
  const skuRows = demand.filter((row) => row.sku === alignment.entityId && row.region === alignment.region);
  const pool = skuRows.length ? skuRows : demand.filter((row) => isGpuSku(row.sku) && row.region === alignment.region);
  if (!pool.length) {
    return undefined;
  }
  const campaign = average(pool.filter((row) => row.campaign_window === 1).map(unitsOf)) ?? 0;
  const baseline = average(pool.filter((row) => row.campaign_window === 0).map(unitsOf)) ?? 0;
  if (baseline <= 0) {
    return undefined;
  }
  return campaign / baseline;
}

export function isGpuSku(sku?: string): boolean {
  return Boolean(sku && GPU_SKUS.has(sku));
}

function unitsOf(row: PartsRow): number {
  return row.units ?? row.gpu ?? 0;
}

function average(values: number[]): number | null {
  if (!values.length) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
