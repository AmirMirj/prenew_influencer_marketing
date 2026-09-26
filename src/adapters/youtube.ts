import { tokenize } from "@/src/domain/scoring";
import type { Candidate, DiscoverQuery } from "@/src/domain/types";
import { matchesFollowerBand } from "@/src/domain/validate";
import type { PlatformAdapter } from "./types";

const YOUTUBE_API_HOST = "https://www.googleapis.com/youtube/v3";

export type FetchLike = typeof fetch;

type YouTubeSearchItem = {
  id?: { channelId?: string };
  snippet?: {
    channelId?: string;
    title?: string;
    description?: string;
    customUrl?: string;
  };
};

type YouTubeChannelItem = {
  id?: string;
  snippet?: {
    title?: string;
    description?: string;
    customUrl?: string;
    country?: string;
    defaultLanguage?: string;
  };
  statistics?: {
    subscriberCount?: string;
    viewCount?: string;
    hiddenSubscriberCount?: boolean;
  };
};

type YouTubeListResponse<T> = {
  items?: T[];
};

export function createYouTubeAdapter(options: {
  apiKey: string;
  fetchFn?: FetchLike;
}): PlatformAdapter {
  const fetchFn = options.fetchFn ?? fetch;

  return {
    platform: "youtube",
    async search(query: DiscoverQuery): Promise<Candidate[]> {
      const searchUrl = new URL(`${YOUTUBE_API_HOST}/search`);
      searchUrl.searchParams.set("part", "snippet");
      searchUrl.searchParams.set("type", "channel");
      searchUrl.searchParams.set("q", query.keywords);
      searchUrl.searchParams.set("maxResults", "10");
      searchUrl.searchParams.set("regionCode", query.market);
      searchUrl.searchParams.set("relevanceLanguage", query.language);
      searchUrl.searchParams.set("key", options.apiKey);

      const searchResponse = await fetchFn(searchUrl.toString());
      const searchBody = (await searchResponse.json()) as YouTubeListResponse<YouTubeSearchItem>;
      const channelIds = (searchBody.items ?? [])
        .map((item) => item.id?.channelId ?? item.snippet?.channelId)
        .filter((id): id is string => Boolean(id));

      if (channelIds.length === 0) {
        return [];
      }

      const channelsUrl = new URL(`${YOUTUBE_API_HOST}/channels`);
      channelsUrl.searchParams.set("part", "snippet,statistics");
      channelsUrl.searchParams.set("id", channelIds.join(","));
      channelsUrl.searchParams.set("key", options.apiKey);

      const channelsResponse = await fetchFn(channelsUrl.toString());
      const channelsBody = (await channelsResponse.json()) as YouTubeListResponse<YouTubeChannelItem>;

      return (channelsBody.items ?? [])
        .map((item) => mapChannel(item, query))
        .filter((candidate) => matchesFollowerBand(candidate.followerCount, query.followerBand));
    },
  };
}

function mapChannel(item: YouTubeChannelItem, query: DiscoverQuery): Candidate {
  const handle = (item.snippet?.customUrl ?? item.id ?? "unknown").replace(/^@/, "");
  const description = item.snippet?.description ?? "";
  const followerCount = Number(item.statistics?.subscriberCount ?? 0);
  const viewCount = Number(item.statistics?.viewCount ?? 0);
  const engagementRate =
    followerCount > 0 ? Math.min(0.15, viewCount / followerCount / 200) : 0.02;

  return {
    id: `youtube:${handle}`,
    platform: "youtube",
    handle,
    displayName: item.snippet?.title ?? handle,
    profileUrl: `https://youtube.com/${handle.startsWith("@") ? handle : `@${handle}`}`,
    followerCount,
    engagementRate,
    language: item.snippet?.defaultLanguage ?? query.language,
    market: item.snippet?.country ?? query.market,
    nicheTags: inferNicheTags(description, query.keywords),
    contentSummary: description.slice(0, 180) || `YouTube channel matching ${query.keywords}`,
    recentTopics: tokenize(description).slice(0, 5),
    contact: {
      status: "found",
      value: `https://youtube.com/@${handle}`,
    },
  };
}

function inferNicheTags(description: string, keywords: string): string[] {
  const haystack = `${description} ${keywords}`.toLowerCase();
  const catalog = [
    "gaming",
    "pc build",
    "hardware review",
    "budget gaming",
    "refurbished",
    "second-hand tech",
  ];
  const hits = catalog.filter((tag) => tag.split(" ").every((part) => haystack.includes(part)));
  return hits.length > 0 ? hits : tokenize(keywords).slice(0, 3);
}
