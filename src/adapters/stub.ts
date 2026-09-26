import { FIXTURE_CREATORS, WEB_SCOUT_CREATORS } from "@/src/fixtures/creators";
import type { Candidate, Platform, SourceId } from "@/src/domain/types";
import { filterCandidates } from "./filter";
import type { PlatformAdapter } from "./types";

export function createStubAdapter(platform: Platform): PlatformAdapter {
  return {
    platform,
    async search(query) {
      const pool = FIXTURE_CREATORS.filter((creator) => creator.platform === platform);
      return filterCandidates(pool, query);
    },
  };
}

export function createWebScoutStub(): PlatformAdapter {
  return {
    platform: "web",
    async search(query) {
      return filterCandidates(WEB_SCOUT_CREATORS, query);
    },
  };
}

export const youtubeStub = createStubAdapter("youtube");
export const tiktokStub = createStubAdapter("tiktok");
export const instagramStub = createStubAdapter("instagram");
export const webScoutStub = createWebScoutStub();

export const STUB_ADAPTERS: PlatformAdapter[] = [youtubeStub, tiktokStub, instagramStub, webScoutStub];

export function fixturesFor(platform: SourceId): Candidate[] {
  if (platform === "web") {
    return WEB_SCOUT_CREATORS;
  }
  return FIXTURE_CREATORS.filter((creator) => creator.platform === platform);
}
