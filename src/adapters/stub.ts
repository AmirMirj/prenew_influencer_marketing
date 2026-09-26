import { FIXTURE_CREATORS } from "@/src/fixtures/creators";
import type { Candidate, Platform } from "@/src/domain/types";
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

export const youtubeStub = createStubAdapter("youtube");
export const tiktokStub = createStubAdapter("tiktok");
export const instagramStub = createStubAdapter("instagram");

export const STUB_ADAPTERS: PlatformAdapter[] = [
  youtubeStub,
  tiktokStub,
  instagramStub,
];

export function fixturesFor(platform: Platform): Candidate[] {
  return FIXTURE_CREATORS.filter((creator) => creator.platform === platform);
}
