import { PRENEW_BRAND } from "@/src/domain/brand";
import { extractEmails } from "@/src/domain/metrics";
import type { Candidate, DiscoverQuery, SuggestedPitch } from "@/src/domain/types";

export const MAX_PITCH_LENGTH = 400;

export function suggestPitch(candidate: Candidate, query: DiscoverQuery): SuggestedPitch {
  const language = query.language.toLowerCase();
  const en = clip(englishPitch(candidate, query));
  const local =
    language === "de"
      ? clip(germanPitch(candidate, query))
      : language === "fi"
        ? clip(finnishPitch(candidate, query))
        : en;
  return { local, en, language };
}

function companyName(query: DiscoverQuery): string {
  return query.companyName?.trim() || PRENEW_BRAND.name;
}

function englishPitch(candidate: Candidate, query: DiscoverQuery): string {
  const niche = candidate.nicheTags[0] ?? "gaming";
  return (
    `Hi ${candidate.displayName} — your ${niche} content is a strong fit. ` +
    `${companyName(query)} sells ${PRENEW_BRAND.product} with warranty, typically ~20% below new retail. ` +
    `Open to a collab for your ${candidate.market} audience?`
  );
}

function germanPitch(candidate: Candidate, query: DiscoverQuery): string {
  const niche = candidate.nicheTags[0] ?? "Gaming";
  return (
    `Hallo ${candidate.displayName} — dein ${niche}-Content passt gut. ` +
    `${companyName(query)} verkauft refurbished Gaming-PCs mit Garantie, oft ~20% unter Neupreis. ` +
    `Lust auf eine Kollabo?`
  );
}

function finnishPitch(candidate: Candidate, query: DiscoverQuery): string {
  const niche = candidate.nicheTags[0] ?? "pelaaminen";
  return (
    `Hei ${candidate.displayName} — ${niche}-sisältösi sopii. ` +
    `${companyName(query)} myy kunnostettuja pelikoneita takuulla, noin 20% alle uuden hinnan. ` +
    `Kiinnostaisiko yhteistyö?`
  );
}

function clip(text: string): string {
  return text.length <= MAX_PITCH_LENGTH ? text : `${text.slice(0, MAX_PITCH_LENGTH - 1)}…`;
}

export function resolveContact(candidate: Candidate): Candidate["contact"] {
  const emails = extractEmails(
    candidate.contact.value,
    candidate.bio,
    candidate.contentSummary,
    ...(candidate.emails ?? []),
  );
  if (emails[0]) {
    return { status: "found", value: emails[0] };
  }
  if (candidate.contact.status === "missing") {
    return { status: "missing" };
  }
  return {
    status: "found",
    value: candidate.contact.value,
  };
}
