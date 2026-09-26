import type { Candidate, DiscoverQuery, Platform } from "@/src/domain/types";

export interface PlatformAdapter {
  readonly platform: Platform;
  search(query: DiscoverQuery): Promise<Candidate[]>;
}
