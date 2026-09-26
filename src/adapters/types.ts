import type { Candidate, DiscoverQuery, SourceId } from "@/src/domain/types";

export interface PlatformAdapter {
  readonly platform: SourceId;
  search(query: DiscoverQuery): Promise<Candidate[]>;
}
