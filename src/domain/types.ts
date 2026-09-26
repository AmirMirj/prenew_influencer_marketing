export type Platform = "youtube" | "tiktok" | "instagram";
export type FollowerBand = "micro" | "mid" | "any";
export type ContactStatus = "found" | "missing";

export type DiscoverQuery = {
  market: string;
  language: string;
  keywords: string;
  followerBand?: FollowerBand;
};

export type CandidateContact = {
  status: ContactStatus;
  value?: string;
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
};

export type FitScore = {
  total: number;
  audienceMatch: number;
  engagementQuality: number;
  brandFit: number;
  reasons: string[];
};

export type ShortlistItem = Candidate & {
  fit: FitScore;
  suggestedPitch: string;
};

export type Shortlist = {
  query: DiscoverQuery;
  items: ShortlistItem[];
};
