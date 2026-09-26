import type { DiscoverQuery } from "@/src/domain/types";

export type DemoBrief = DiscoverQuery & {
  followerBand: NonNullable<DiscoverQuery["followerBand"]>;
  companyName: string;
  companyDescription: string;
  niche: string;
};

export type DemoStep = {
  id: string;
  title: string;
  body: string;
  brief: DemoBrief;
  target: string;
  openId?: string;
};

export const DEMO_PRENEW: DemoBrief = {
  market: "DE",
  language: "de",
  keywords: "budget gaming PC",
  followerBand: "micro",
  companyName: "Prenew",
  companyDescription: "Refurbished gaming PCs with warranty — about 20% below new retail.",
  niche: "budget-builds",
};

export const DEMO_GPU: DemoBrief = {
  ...DEMO_PRENEW,
  keywords: "hardware review GPU",
  followerBand: "any",
  niche: "gpu-reviews",
};

export const DEMO_STEPS: DemoStep[] = [
  {
    id: "brief",
    title: "Who, then where",
    body: "Budget PC builds in Germany. Reach expands into gebraucht and Preis-Leistung. Shortlist and pitches work without API keys.",
    brief: DEMO_PRENEW,
    target: "demo-guide",
  },
  {
    id: "gems",
    title: "Hidden gems, not megas",
    body: "Ranked by niche, market, and engagement vs typical size. Reasons never mention audience size.",
    brief: DEMO_PRENEW,
    target: "demo-results",
  },
  {
    id: "insights",
    title: "Compare yield, not size",
    body: "Modeled CTR is 0.36% gaming vs 0.27% tech. Same views are not the same click bet. Use this to pick who can move a refurbished-PC offer.",
    brief: DEMO_PRENEW,
    target: "demo-insights",
  },
  {
    id: "ben",
    title: "Email this one",
    body: "Select Build mit Ben. The German pitch leads with gebraucht and Preis-Leistung, warranty vs new, and seeding only to a German address. Copy that template.",
    brief: DEMO_PRENEW,
    target: "demo-pitch",
    openId: "youtube:buildmitben",
  },
  {
    id: "dez",
    title: "Same market, weaker ask",
    body: "DezGamez stays in Germany but the stream PC is flagship-new. The pitch is for his viewers, not the broadcast rig — or pass.",
    brief: DEMO_GPU,
    target: "demo-pitch",
    openId: "youtube:dezgamez",
  },
];

export function demoStepAt(index: number): DemoStep {
  const clamped = Math.max(0, Math.min(index, DEMO_STEPS.length - 1));
  return DEMO_STEPS[clamped];
}

export function shouldAutoStartDemo(search: string): boolean {
  return /(?:^|[?&])demo(?:=1|&|$)/.test(search);
}

export function demoShouldSearch(current: DemoBrief | null, step: DemoStep): boolean {
  if (!current) {
    return true;
  }
  return (
    current.market !== step.brief.market ||
    current.language !== step.brief.language ||
    current.keywords !== step.brief.keywords ||
    current.followerBand !== step.brief.followerBand ||
    current.niche !== step.brief.niche
  );
}

export const HOW_IT_WORKS = [
  { id: "niche", label: "Select Niche" },
  { id: "specs", label: "View Curated Specs" },
  { id: "pitch", label: "Copy Pitch" },
  { id: "api", label: "Scale with API" },
] as const;
