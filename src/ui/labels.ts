import type { FollowerBand } from "@/src/domain/types";

const MARKETS: Record<string, string> = {
  DE: "Germany",
  FI: "Finland",
  FR: "France",
  AT: "Austria",
  SE: "Sweden",
  US: "United States",
  UK: "United Kingdom",
  GB: "United Kingdom",
};

const LANGUAGES: Record<string, string> = {
  de: "German",
  fi: "Finnish",
  en: "English",
  fr: "French",
  sv: "Swedish",
};

export function marketLabel(code: string): string {
  return MARKETS[code.toUpperCase()] ?? code.toUpperCase();
}

export function languageLabel(code: string): string {
  return LANGUAGES[code.toLowerCase()] ?? code;
}

export function bandLabel(band: FollowerBand | undefined): string {
  if (band === "mid") {
    return "Mid-size (50k–250k)";
  }
  if (band === "any") {
    return "Any size";
  }
  return "Small creators (1k–50k)";
}

export function isEmail(value?: string): boolean {
  return Boolean(value && /[^\s@]+@[^\s@]+\.[^\s@]+/.test(value));
}

export function copyButtonLabel(copied: boolean, idle: string): string {
  return copied ? "Copied to Clipboard!" : idle;
}

export function pitchTemplate(body: string, brand: string): string {
  return `Subject: Hardware Partnership / ${brand}\n\n${body}`;
}

export function whyOneLiner(item: {
  fit: { hiddenGem: boolean; reasons: string[]; engagementQuality: number };
  followerCount: number;
  market: string;
  nicheTags: string[];
}): string {
  if (item.fit.reasons[0]) {
    return item.fit.reasons[0];
  }
  const niche = item.nicheTags[0] ?? "gaming";
  return `Strong ${niche} fit in ${marketLabel(item.market)} · ${item.followerCount.toLocaleString("en-US")} followers`;
}
