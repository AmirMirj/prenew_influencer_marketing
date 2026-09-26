import { computeForecast, type CampaignForecast } from "./forecast";
import type { Candidate } from "./types";

export type HardwareBracket = "value" | "mid" | "enthusiast" | "unknown";

export type CampaignDossier = CampaignForecast & {
  gpu?: string;
  cpu?: string;
  memory?: string;
  storage?: string;
  bracket: HardwareBracket;
  hardwareFit: number;
  pitchAngle: string;
  partnerships: string[];
  otherPlatforms: string[];
};

const VALUE_MARKERS = [
  "refurbished",
  "refurb",
  "gebraucht",
  "used",
  "second-hand",
  "kunnostettu",
  "4060",
  "4070",
  "budget",
  "preis-leistung",
];

const ENTHUSIAST_MARKERS = ["5090", "4090", "9950", "14900k", "64gb", "enthusiast", "flagship"];

export const EU_CAMPAIGN_BENCHMARKS = {
  brandRelevantCreators: 1_390_000,
  topMarkets: ["Italy", "France", "Great Britain", "Germany"],
};

export function computeCampaign(candidate: Candidate): CampaignDossier {
  const haystack = [
    candidate.displayName,
    candidate.contentSummary,
    candidate.bio ?? "",
    ...(candidate.nicheTags ?? []),
    ...(candidate.recentTopics ?? []),
    ...(candidate.games ?? []),
    candidate.hardware?.gpu,
    candidate.hardware?.cpu,
    candidate.hardware?.memory,
    candidate.hardware?.storage,
    ...(candidate.partnerships ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const gpu = candidate.hardware?.gpu ?? inferChip(haystack, /rtx\s?\d{4}|geforce[^\n,]{0,24}|used \d{4}/i);
  const cpu = candidate.hardware?.cpu ?? inferChip(haystack, /ryzen[^\n,]{0,24}|core i[0-9][^\n,]{0,16}/i);
  const memory = candidate.hardware?.memory ?? inferChip(haystack, /\d{2}gb ddr5?/i);
  const storage = candidate.hardware?.storage ?? inferChip(haystack, /990 pro|nvme|ssd/i);
  const bracket = hardwareBracket(haystack, gpu);
  const hardwareFit = fitForBracket(bracket);
  const partnerships = unique(candidate.partnerships ?? inferPartnerships(haystack));
  const otherPlatforms = unique(candidate.otherPlatforms ?? inferPlatforms(candidate));

  return {
    gpu,
    cpu,
    memory,
    storage,
    bracket,
    hardwareFit,
    pitchAngle: pitchAngleFor(candidate, bracket, partnerships),
    partnerships,
    otherPlatforms,
    ...computeForecast(candidate),
  };
}

export function hardwareBracket(haystack: string, gpu?: string): HardwareBracket {
  const text = `${haystack} ${gpu ?? ""}`.toLowerCase();
  if (ENTHUSIAST_MARKERS.some((marker) => text.includes(marker))) {
    return "enthusiast";
  }
  if (VALUE_MARKERS.some((marker) => text.includes(marker))) {
    return "value";
  }
  if (text.includes("gpu") || text.includes("rtx") || text.includes("pc")) {
    return "mid";
  }
  return "unknown";
}

function fitForBracket(bracket: HardwareBracket): number {
  if (bracket === "value") {
    return 90;
  }
  if (bracket === "mid") {
    return 62;
  }
  if (bracket === "enthusiast") {
    return 28;
  }
  return 45;
}

function pitchAngleFor(candidate: Candidate, bracket: HardwareBracket, partnerships: string[]): string {
  if (bracket === "enthusiast") {
    return (
      `Public setup is flagship-new, so a refurbished-PC pitch is a weak personal-rig match. ` +
      `Better angle: value machines for the ${candidate.games?.[0] ?? "sim"} audience, not his broadcast PC.`
    );
  }
  if (bracket === "value") {
    return `Public setup already sits in the used/value bracket — lead with warranty vs P2P and ~20% under new retail.`;
  }
  if (partnerships.length >= 3) {
    return `Roster is already busy (${partnerships.slice(0, 3).join(", ")}). Keep the ask small and hardware-specific.`;
  }
  return `Use public specs and community size to keep the pitch concrete — no invented contact.`;
}

function inferChip(haystack: string, pattern: RegExp): string | undefined {
  const match = haystack.match(pattern);
  return match?.[0]?.trim();
}

function inferPartnerships(haystack: string): string[] {
  const catalog = ["surfshark", "huel", "ekster", "raid", "boosteroid", "wargaming", "mindfactory"];
  return catalog.filter((name) => haystack.includes(name)).map((name) => titleCase(name));
}

function inferPlatforms(candidate: Candidate): string[] {
  const extra = Object.keys(candidate.socials ?? {});
  return unique([candidate.platform, ...extra]);
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
