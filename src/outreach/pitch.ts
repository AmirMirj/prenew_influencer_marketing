import { PRENEW_BRAND } from "@/src/domain/brand";
import type { Candidate } from "@/src/domain/types";

const MAX_PITCH_LENGTH = 400;

export function suggestPitch(candidate: Candidate): string {
  const niche = candidate.nicheTags[0] ?? "gaming";
  const pitch =
    `Hi ${candidate.displayName} — your ${niche} content is a strong fit. ` +
    `${PRENEW_BRAND.name} sells ${PRENEW_BRAND.product} with warranty, typically ~20% below new retail. ` +
    `Open to a collab for your ${candidate.market} audience?`;

  return pitch.length <= MAX_PITCH_LENGTH ? pitch : `${pitch.slice(0, MAX_PITCH_LENGTH - 1)}…`;
}

export function preserveContact(candidate: Candidate): Candidate["contact"] {
  if (candidate.contact.status === "missing") {
    return { status: "missing" };
  }
  return {
    status: "found",
    value: candidate.contact.value,
  };
}
