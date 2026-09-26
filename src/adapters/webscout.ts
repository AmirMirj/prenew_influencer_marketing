import { filterCandidates } from "@/src/adapters/filter";
import type { PlatformAdapter } from "@/src/adapters/types";
import { extractEmails } from "@/src/domain/metrics";
import { tokenize } from "@/src/domain/scoring";
import type { Candidate, DiscoverQuery, Platform } from "@/src/domain/types";
import { FIXTURE_CREATORS, WEB_SCOUT_CREATORS } from "@/src/fixtures/creators";
import { ALLOWED_SCOUT_HOSTS, SCOUT_CORPUS, type ScoutPage } from "@/src/fixtures/webpages";

const CHANNEL_PATTERNS: Array<{ platform: Platform; regex: RegExp }> = [
  { platform: "youtube", regex: /https?:\/\/(?:www\.)?youtube\.com\/@([A-Za-z0-9._-]+)/gi },
  { platform: "tiktok", regex: /https?:\/\/(?:www\.)?tiktok\.com\/@([A-Za-z0-9._-]+)/gi },
  { platform: "instagram", regex: /https?:\/\/(?:www\.)?instagram\.com\/([A-Za-z0-9._]+)\/?(?:\?|$|"|'|<|\s)/gi },
];

const CATALOG = [...FIXTURE_CREATORS, ...WEB_SCOUT_CREATORS];

function isForumHost(host: string | undefined): boolean {
  if (!host) {
    return false;
  }
  return !host.includes("youtube.com");
}

export function isAllowedScoutHost(host: string): boolean {
  const normalized = host.toLowerCase().replace(/\.$/, "");
  return ALLOWED_SCOUT_HOSTS.some((allowed) => normalized === allowed || normalized.endsWith(`.${allowed}`));
}

export function extractChannelMentions(html: string): Array<{ platform: Platform; handle: string; url: string }> {
  const found: Array<{ platform: Platform; handle: string; url: string }> = [];
  const seen = new Set<string>();
  for (const { platform, regex } of CHANNEL_PATTERNS) {
    regex.lastIndex = 0;
    for (const match of html.matchAll(regex)) {
      const handle = match[1]?.replace(/\/+$/, "");
      if (!handle || handle === "p" || handle === "reel" || handle === "tv") {
        continue;
      }
      const key = `${platform}:${handle.toLowerCase()}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      found.push({
        platform,
        handle,
        url: platform === "youtube" ? `https://youtube.com/@${handle}` : `https://${platform}.com/${platform === "tiktok" ? "@" : ""}${handle}`,
      });
    }
  }
  return found;
}

export function pageMatchesQuery(page: ScoutPage, query: DiscoverQuery): boolean {
  if (page.market.toUpperCase() !== query.market.toUpperCase()) {
    return false;
  }
  if (page.language.toLowerCase() !== query.language.toLowerCase()) {
    return false;
  }
  const tokens = tokenize(`${query.keywords} ${query.niche ?? ""}`);
  if (tokens.length === 0) {
    return true;
  }
  const haystack = `${page.title} ${page.html}`.toLowerCase();
  return tokens.some((token) => haystack.includes(token));
}

export function candidatesFromPage(page: ScoutPage, html: string): Candidate[] {
  const email = extractEmails(html)[0];
  return extractChannelMentions(html).flatMap((mention) => {
    const known = CATALOG.find(
      (creator) =>
        creator.platform === mention.platform && creator.handle.toLowerCase() === mention.handle.toLowerCase(),
    );
    if (!known) {
      return [];
    }
    return [
      {
        ...known,
        foundVia: ["web"],
        foundOn: page.host,
        contentSummary: `Found on ${page.host}: ${page.title}`,
        bio: [known.bio, email].filter(Boolean).join(" · "),
        contact: email ? { status: "found", value: email } : known.contact,
      },
    ];
  });
}

export async function readScoutHtml(
  page: ScoutPage,
  fetchFn: typeof fetch,
  live: boolean,
): Promise<string> {
  if (!live) {
    return page.html;
  }
  if (!isAllowedScoutHost(new URL(page.url).hostname)) {
    return page.html;
  }
  try {
    const response = await fetchFn(page.url, {
      headers: { Accept: "text/html", "User-Agent": "ReachScout/0.1 (public allowlist)" },
    });
    if (!response.ok) {
      return page.html;
    }
    return await response.text();
  } catch {
    return page.html;
  }
}

export function createWebScoutAdapter(options?: {
  fetchFn?: typeof fetch;
  live?: boolean;
}): PlatformAdapter {
  const fetchFn = options?.fetchFn ?? fetch;
  const live = options?.live ?? process.env.WEB_SCOUT_LIVE === "1";

  return {
    platform: "web",
    async search(query: DiscoverQuery): Promise<Candidate[]> {
      const hits: Candidate[] = [];
      for (const page of SCOUT_CORPUS.filter((entry) => pageMatchesQuery(entry, query))) {
        const html = await readScoutHtml(page, fetchFn, live);
        hits.push(...candidatesFromPage(page, html));
      }
      const unique = new Map<string, Candidate>();
      for (const candidate of hits) {
        const previous = unique.get(candidate.id);
        if (!previous || isForumHost(candidate.foundOn) && !isForumHost(previous.foundOn)) {
          unique.set(candidate.id, candidate);
        }
      }
      return filterCandidates([...unique.values()], query);
    },
  };
}
