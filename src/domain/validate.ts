import type { DiscoverQuery, FollowerBand } from "./types";

const FOLLOWER_BANDS: FollowerBand[] = ["micro", "mid", "any"];

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function normalizeQuery(input: unknown): DiscoverQuery {
  if (input === null || typeof input !== "object") {
    throw new ValidationError("Request body must be an object");
  }

  const body = input as Record<string, unknown>;
  const market = readRequiredString(body, "market");
  const language = readRequiredString(body, "language");
  const keywords = readRequiredString(body, "keywords");

  let followerBand: FollowerBand | undefined;
  if (body.followerBand !== undefined && body.followerBand !== "") {
    if (
      typeof body.followerBand !== "string" ||
      !FOLLOWER_BANDS.includes(body.followerBand as FollowerBand)
    ) {
      throw new ValidationError("followerBand must be micro, mid, or any");
    }
    followerBand = body.followerBand as FollowerBand;
  }

  const companyName = readOptionalString(body, "companyName");
  const companyDescription = readOptionalString(body, "companyDescription");
  const niche = readOptionalString(body, "niche");

  return { market, language, keywords, followerBand, companyName, companyDescription, niche };
}

function readOptionalString(body: Record<string, unknown>, field: string): string | undefined {
  const value = body[field];
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }
  return value.trim();
}

function readRequiredString(body: Record<string, unknown>, field: string): string {
  const value = body[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw new ValidationError(`${field} is required`);
  }
  return value.trim();
}

export function matchesFollowerBand(
  followerCount: number,
  band: FollowerBand | undefined,
): boolean {
  if (!band || band === "any") {
    return true;
  }
  if (band === "micro") {
    return followerCount >= 1_000 && followerCount <= 50_000;
  }
  return followerCount >= 50_000 && followerCount <= 250_000;
}
