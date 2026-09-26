import {
  loadCommentSample,
  loadPartsSample,
  loadRoiSample,
  type CommentRow,
  type PartsRow,
  type RoiRow,
} from "@/src/data/samples";
import {
  alignCandidate,
  alignedDemandLift,
  cleanActivity,
  cleanComments,
  isGameOnly,
  isGpuSku,
} from "./align";
import type { Candidate } from "./types";

export const GAMING_CTR = 0.0036;
export const TECH_CTR = 0.0027;

export type SalesDriver = "views" | "engagement";
export type SentimentLabel = "positive" | "neutral" | "skeptical" | "negative";

export type OlsFit = {
  intercept: number;
  slope: number;
  r2: number;
};

export type SalesModels = {
  views: OlsFit;
  engagement: OlsFit;
  driver: SalesDriver;
  r2: number;
};

export type DemandLift = {
  gpuLift: number;
  cpuLift: number;
  campaignGpuMean: number;
  baselineGpuMean: number;
};

export type CampaignForecast = {
  predictedSales?: number;
  salesDriver?: SalesDriver;
  gpuDemandLift?: number;
  sentiment?: SentimentLabel;
  expectedClicks?: number;
  ctr?: number;
  alignedWeek?: string;
  alignedSku?: string;
  alignedRegion?: string;
  temporalAnchor?: boolean;
  viralOutlier?: boolean;
  volumeOk?: boolean;
  gameNoiseFiltered?: number;
  interactionVolume?: number;
};

const POSITIVE = ["warranty", "value", "gebraucht", "pelikone"];
const NEGATIVE = ["scam", "overpriced", "mining"];
const SKEPTICAL = ["wait", "maybe"];
const GPU_TAG = /5090|4090|4070|4060|rtx|geforce|\bgpu\b/i;

export function ordinaryLeastSquares(xs: number[], ys: number[]): OlsFit {
  const n = Math.min(xs.length, ys.length);
  if (n === 0) {
    return { intercept: 0, slope: 0, r2: 0 };
  }
  const meanX = mean(xs.slice(0, n));
  const meanY = mean(ys.slice(0, n));
  let ssxx = 0;
  let ssxy = 0;
  let ssyy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    ssxx += dx * dx;
    ssxy += dx * dy;
    ssyy += dy * dy;
  }
  const slope = ssxx === 0 ? 0 : ssxy / ssxx;
  const intercept = meanY - slope * meanX;
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const residual = ys[i] - (intercept + slope * xs[i]);
    ssRes += residual * residual;
  }
  const r2 = ssyy === 0 ? 0 : 1 - ssRes / ssyy;
  return { intercept, slope, r2 };
}

export function fitSalesDrivers(rows: RoiRow[] = loadRoiSample()): SalesModels {
  const views = ordinaryLeastSquares(
    rows.map((row) => row.views),
    rows.map((row) => row.attributed_sales),
  );
  const engagement = ordinaryLeastSquares(
    rows.map((row) => row.engagement_rate),
    rows.map((row) => row.attributed_sales),
  );
  const driver: SalesDriver = engagement.r2 >= views.r2 ? "engagement" : "views";
  return {
    views,
    engagement,
    driver,
    r2: driver === "engagement" ? engagement.r2 : views.r2,
  };
}

export const ROI_MODELS = fitSalesDrivers(cleanActivity(loadRoiSample()));

export function predictSales(
  candidate: Candidate,
  models: SalesModels = ROI_MODELS,
): { predictedSales: number; salesDriver: SalesDriver } | undefined {
  const x =
    models.driver === "engagement" ? candidate.engagementRate : viewsOf(candidate);
  if (x == null || !Number.isFinite(x)) {
    return undefined;
  }
  const fit = models.driver === "engagement" ? models.engagement : models.views;
  return {
    predictedSales: Math.max(0, Math.round(fit.intercept + fit.slope * x)),
    salesDriver: models.driver,
  };
}

export function computeDemandLift(rows: PartsRow[] = loadPartsSample()): DemandLift {
  const gpuRows = rows.filter((row) => isGpuSku(row.sku) || (row.gpu ?? 0) > 0);
  const campaign = gpuRows.filter((row) => row.campaign_window === 1);
  const baseline = gpuRows.filter((row) => row.campaign_window === 0);
  const unit = (row: PartsRow) => row.units ?? row.gpu;
  const campaignGpuMean = mean(campaign.map(unit));
  const baselineGpuMean = mean(baseline.map(unit));
  return {
    gpuLift: ratio(campaignGpuMean, baselineGpuMean),
    cpuLift: ratio(mean(campaign.map((row) => row.cpu)), mean(baseline.map((row) => row.cpu))),
    campaignGpuMean,
    baselineGpuMean,
  };
}

export const PARTS_DEMAND = computeDemandLift();

export function gpuDemandLiftFor(candidate: Candidate, demand: DemandLift = PARTS_DEMAND): number | undefined {
  const alignment = alignCandidate(candidate);
  const aligned = alignedDemandLift(alignment);
  if (aligned != null) {
    return aligned;
  }
  const tag = [
    candidate.hardware?.gpu,
    candidate.contentSummary,
    ...(candidate.recentTopics ?? []),
    ...(candidate.nicheTags ?? []),
  ]
    .filter(Boolean)
    .join(" ");
  if (!GPU_TAG.test(tag) || alignment.viralOutlier) {
    return undefined;
  }
  return demand.gpuLift;
}

export function scoreSentiment(text: string): SentimentLabel {
  const haystack = text.toLowerCase();
  const positive = countHits(haystack, POSITIVE);
  const negative = countHits(haystack, NEGATIVE);
  const skeptical = countHits(haystack, SKEPTICAL);
  if (negative > 0 && negative >= positive && negative >= skeptical) {
    return "negative";
  }
  if (skeptical > 0 && skeptical >= positive && negative === 0) {
    return "skeptical";
  }
  if (positive > 0 && positive > negative && positive > skeptical) {
    return "positive";
  }
  if (negative > 0) {
    return "negative";
  }
  if (skeptical > 0) {
    return "skeptical";
  }
  if (positive > 0) {
    return "positive";
  }
  return "neutral";
}

export function scoreCreatorSentiment(
  candidate: Candidate,
  comments: CommentRow[] = cleanComments(loadCommentSample()),
): SentimentLabel {
  const tied = commentsFor(candidate, comments);
  const postText = (candidate.recentPosts ?? [])
    .map((post) => post.text ?? "")
    .filter((text) => text && !isGameOnly(text))
    .join(" ");
  const blob = [...tied.map((row) => `${row.hashtags} ${row.text}`), postText].join(" ").trim();
  if (!blob) {
    return "neutral";
  }
  return scoreSentiment(blob);
}

export function ctrFor(candidate: Candidate): number {
  const tags = (candidate.nicheTags ?? []).map((tag) => tag.toLowerCase());
  const gaming = tags.some((tag) => tag.includes("gaming") || tag.includes("game"));
  return gaming ? GAMING_CTR : TECH_CTR;
}

export function expectedClicksFor(candidate: Candidate): { expectedClicks: number; ctr: number } | undefined {
  const views = viewsOf(candidate);
  if (views == null || views <= 0) {
    return undefined;
  }
  const ctr = ctrFor(candidate);
  return { expectedClicks: Math.round(views * ctr), ctr };
}

export function forecastReason(forecast: CampaignForecast): string | undefined {
  if (forecast.alignedSku && forecast.alignedRegion && forecast.temporalAnchor) {
    return `Joined activity, comments, and demand on ${forecast.alignedRegion} ${forecast.alignedSku} in ${forecast.alignedWeek}.`;
  }
  if (forecast.expectedClicks == null || forecast.ctr == null) {
    return undefined;
  }
  const niche = forecast.ctr === GAMING_CTR ? "gaming" : "tech";
  return `Modeled clicks use the ${(forecast.ctr * 100).toFixed(2)}% ${niche} CTR benchmark.`;
}

export function computeForecast(candidate: Candidate): CampaignForecast {
  const sales = predictSales(candidate);
  const clicks = expectedClicksFor(candidate);
  const alignment = alignCandidate(candidate);
  return {
    predictedSales: alignment.viralOutlier ? undefined : sales?.predictedSales,
    salesDriver: alignment.viralOutlier ? undefined : sales?.salesDriver,
    gpuDemandLift: gpuDemandLiftFor(candidate),
    sentiment: scoreCreatorSentiment(candidate),
    expectedClicks: clicks?.expectedClicks,
    ctr: clicks?.ctr,
    alignedWeek: alignment.key?.week,
    alignedSku: alignment.entityId,
    alignedRegion: alignment.region,
    temporalAnchor: alignment.temporalAnchor,
    viralOutlier: alignment.viralOutlier,
    volumeOk: alignment.volumeOk,
    gameNoiseFiltered: alignment.gameNoiseFiltered,
    interactionVolume: alignment.interactionVolume,
  };
}

function commentsFor(candidate: Candidate, comments: CommentRow[]): CommentRow[] {
  const handle = candidate.handle.toLowerCase();
  const markers = [
    candidate.hardware?.gpu,
    candidate.hardware?.cpu,
    ...(candidate.nicheTags ?? []),
  ]
    .filter(Boolean)
    .flatMap((value) => String(value).toLowerCase().match(/5090|4060|4070|amd|budgetbuild|refurbished/g) ?? []);
  return comments.filter((row) => {
    if (row.handle.toLowerCase() === handle) {
      return true;
    }
    const haystack = `${row.hashtags} ${row.text}`.toLowerCase();
    return markers.some((marker) => haystack.includes(marker));
  });
}

function viewsOf(candidate: Candidate): number | null {
  if (candidate.avgViews != null) {
    return candidate.avgViews;
  }
  const posts = (candidate.recentPosts ?? []).filter((post) => post.views != null);
  if (!posts.length) {
    return null;
  }
  return Math.round(posts.reduce((sum, post) => sum + (post.views ?? 0), 0) / posts.length);
}

function countHits(haystack: string, words: string[]): number {
  return words.reduce((count, word) => count + (haystack.includes(word) ? 1 : 0), 0);
}

function mean(values: number[]): number {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function ratio(numerator: number, denominator: number): number {
  if (denominator === 0) {
    return 0;
  }
  return numerator / denominator;
}
