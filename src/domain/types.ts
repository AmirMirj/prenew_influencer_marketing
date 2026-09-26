export type Platform = "youtube" | "tiktok" | "instagram";
export type SourceId = Platform | "web";
export type FoundVia = "search" | "web";
export type FollowerBand = "micro" | "mid" | "any";
export type ContactStatus = "found" | "missing";
export type OutreachStatus = "new" | "shortlisted" | "contacted" | "passed";
export type CreatorTier = "nano" | "micro" | "mid" | "macro";

export type DiscoverQuery = {
  market: string;
  language: string;
  keywords: string;
  followerBand?: FollowerBand;
  companyName?: string;
  companyDescription?: string;
  niche?: string;
};

export type CandidateContact = {
  status: ContactStatus;
  value?: string;
};

export type RecentPost = {
  date: string;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  isShort?: boolean;
  text?: string;
};

export type Candidate = {
  id: string;
  platform: Platform;
  handle: string;
  displayName: string;
  profileUrl: string;
  followerCount: number;
  engagementRate: number;
  language: string;
  market: string;
  nicheTags: string[];
  contentSummary: string;
  recentTopics: string[];
  contact: CandidateContact;
  games?: string[];
  recentPosts?: RecentPost[];
  bio?: string;
  bioLink?: string;
  lastPostAt?: string;
  daysSinceLastPost?: number;
  avgViews?: number | null;
  viewsTrend?: number | null;
  trend?: "Growing" | "Declining" | "Stable" | "";
  emails?: string[];
  socials?: Record<string, string>;
  foundVia?: FoundVia[];
  tier?: CreatorTier;
  engagementScore?: number;
  activityScore?: number;
  relativeEngagement?: number | null;
  interactionQuality?: number | null;
  recencyMultiplier?: number;
};

export type FitScore = {
  total: number;
  audienceMatch: number;
  marketFit: number;
  nicheFit: number;
  brandFit: number;
  engagementQuality: number;
  activity: number;
  brandSafety: number;
  reasons: string[];
  hiddenGem: boolean;
  redFlags: string[];
  competitorSponsor: boolean;
  relativeEngagement: number | null;
};

export type SuggestedPitch = {
  local: string;
  en: string;
  language: string;
};

export type QueryPlan = {
  original: string;
  expansions: string[];
  terms: string[];
};

export type DiscoverSteps = {
  planned: number;
  sourced: number;
  filtered: number;
  scored: number;
};

export type ShortlistItem = Candidate & {
  fit: FitScore;
  suggestedPitch: SuggestedPitch;
  outreachStatus?: OutreachStatus;
};

export type Shortlist = {
  query: DiscoverQuery;
  plan: QueryPlan;
  steps: DiscoverSteps;
  items: ShortlistItem[];
};
