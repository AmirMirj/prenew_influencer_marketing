import type { FollowerBand } from "./types";

export type Niche = {
  id: string;
  label: string;
  keywords: string;
  extraTerms: string[];
  followerBand: FollowerBand;
  featured: boolean;
};

export const NICHES: Niche[] = [
  {
    id: "budget-builds",
    label: "Budget PC builds",
    keywords: "budget gaming PC",
    extraTerms: ["pc build"],
    followerBand: "micro",
    featured: true,
  },
  {
    id: "refurbished",
    label: "Refurbished hardware",
    keywords: "refurbished hardware",
    extraTerms: ["gebraucht", "kunnostettu", "second-hand"],
    followerBand: "micro",
    featured: true,
  },
  {
    id: "gpu-reviews",
    label: "GPU reviews",
    keywords: "hardware review GPU",
    extraTerms: ["RTX", "GPU"],
    followerBand: "any",
    featured: true,
  },
  {
    id: "value-gaming",
    label: "Value gaming",
    keywords: "value gaming cheap",
    extraTerms: ["Preis-Leistung", "cheap vs new"],
    followerBand: "micro",
    featured: true,
  },
  {
    id: "small-country",
    label: "Small-country gaming",
    keywords: "local gaming community",
    extraTerms: ["pelikone", "local gaming"],
    followerBand: "micro",
    featured: true,
  },
  {
    id: "aesthetic-builds",
    label: "Pretty PC builds",
    keywords: "cable management aesthetic",
    extraTerms: ["pc build"],
    followerBand: "micro",
    featured: false,
  },
  {
    id: "fps-setups",
    label: "FPS / esports setups",
    keywords: "fps setup valorant",
    extraTerms: ["CS2"],
    followerBand: "micro",
    featured: false,
  },
  {
    id: "first-pc",
    label: "Student / first PC",
    keywords: "student first PC",
    extraTerms: ["Eltern", "opiskelija"],
    followerBand: "micro",
    featured: false,
  },
  {
    id: "upgrade",
    label: "Repair / upgrade",
    keywords: "upgrade GPU",
    extraTerms: ["repair"],
    followerBand: "micro",
    featured: false,
  },
  {
    id: "creator-setup",
    label: "Creator setups",
    keywords: "stream PC setup",
    extraTerms: ["creator setup"],
    followerBand: "micro",
    featured: false,
  },
  {
    id: "family",
    label: "Family / living-room",
    keywords: "living room family gaming",
    extraTerms: ["Wohnzimmer"],
    followerBand: "micro",
    featured: false,
  },
];

export const FEATURED_NICHES = NICHES.filter((niche) => niche.featured);
export const EXTRA_NICHES = NICHES.filter((niche) => !niche.featured);

export function nicheById(id: string | undefined): Niche | undefined {
  return NICHES.find((niche) => niche.id === id);
}

export function nicheByKeywords(keywords: string): Niche | undefined {
  return NICHES.find((niche) => niche.keywords.toLowerCase() === keywords.trim().toLowerCase());
}

export function nicheLabel(idOrKeywords: string | undefined): string | undefined {
  if (!idOrKeywords) {
    return undefined;
  }
  return nicheById(idOrKeywords)?.label ?? nicheByKeywords(idOrKeywords)?.label;
}
