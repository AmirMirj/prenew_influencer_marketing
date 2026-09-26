import { PRENEW_BRAND } from "@/src/domain/brand";
import { extractEmails } from "@/src/domain/metrics";
import type { Candidate, DiscoverQuery, SuggestedPitch } from "@/src/domain/types";

export const MAX_PITCH_LENGTH = 400;

export type PitchHook = "value" | "audience" | "seeding" | "warranty";

const VALUE_MARKERS = [
  "refurbished",
  "refurb",
  "gebraucht",
  "kunnostettu",
  "second-hand",
  "secondhand",
  "used gpu",
  "used-hardware",
  "budget",
  "preis-leistung",
];

const ENTHUSIAST_MARKERS = ["5090", "4090", "9950", "14900k", "64gb", "enthusiast", "flagship"];

const MARKET_EN: Record<string, string> = {
  DE: "Germany",
  FI: "Finland",
  AT: "Austria",
  SE: "Sweden",
};

const MARKET_DE: Record<string, string> = {
  DE: "Deutschland",
  FI: "Finnland",
  AT: "Österreich",
  SE: "Schweden",
};

const MARKET_FI: Record<string, string> = {
  DE: "Saksa",
  FI: "Suomi",
  AT: "Itävalta",
  SE: "Ruotsi",
};

export function suggestPitch(candidate: Candidate, query: DiscoverQuery): SuggestedPitch {
  const language = query.language.toLowerCase();
  const hook = pitchHook(candidate);
  const slots = pitchSlots(candidate, query);
  const en = clip(fillPitch("en", hook, slots));
  const local =
    language === "de"
      ? clip(fillPitch("de", hook, slots))
      : language === "fi"
        ? clip(fillPitch("fi", hook, slots))
        : en;
  return { local, en, language };
}

export function pitchHook(candidate: Candidate): PitchHook {
  const haystack = [
    candidate.displayName,
    candidate.contentSummary,
    candidate.bio ?? "",
    ...(candidate.nicheTags ?? []),
    ...(candidate.recentTopics ?? []),
    candidate.hardware?.gpu,
    candidate.hardware?.cpu,
    candidate.hardware?.memory,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (ENTHUSIAST_MARKERS.some((marker) => haystack.includes(marker))) {
    return "audience";
  }
  if (VALUE_MARKERS.some((marker) => haystack.includes(marker))) {
    return "value";
  }
  if (["DE", "FI", "AT", "SE"].includes(candidate.market.toUpperCase())) {
    return "seeding";
  }
  return "warranty";
}

function pitchSlots(candidate: Candidate, query: DiscoverQuery) {
  const lang = query.language.toLowerCase();
  const marketCode = candidate.market.toUpperCase();
  return {
    creator: candidate.displayName,
    niche: candidate.nicheTags[0] ?? (lang === "fi" ? "pelaaminen" : lang === "de" ? "Gaming" : "gaming"),
    market:
      lang === "de"
        ? (MARKET_DE[marketCode] ?? marketCode)
        : lang === "fi"
          ? (MARKET_FI[marketCode] ?? marketCode)
          : (MARKET_EN[marketCode] ?? marketCode),
    marketEn: MARKET_EN[marketCode] ?? marketCode,
    brand: query.companyName?.trim() || PRENEW_BRAND.name,
    productEn: PRENEW_BRAND.product,
    productDe: "refurbished Gaming-PCs",
    productFi: "kunnostettuja pelikoneita",
  };
}

type Slots = ReturnType<typeof pitchSlots>;

function fillPitch(lang: "en" | "de" | "fi", hook: PitchHook, slots: Slots): string {
  if (lang === "de") {
    return germanPitch(hook, slots);
  }
  if (lang === "fi") {
    return finnishPitch(hook, slots);
  }
  return englishPitch(hook, slots);
}

function englishPitch(hook: PitchHook, slots: Slots): string {
  const { creator, niche, marketEn, brand, productEn } = slots;
  if (hook === "value") {
    return (
      `Hi ${creator} — you already cover value and used hardware. ` +
      `${brand} ${productEn} sit in that bracket: warranty included, priced under new. ` +
      `Happy to seed a unit to a ${marketEn} address if the story fits.`
    );
  }
  if (hook === "audience") {
    return (
      `Hi ${creator} — your ${niche} audience still buys value kit even if the stream PC is new. ` +
      `${brand} ${productEn} come with warranty, ~20% under retail, seeded in ${marketEn}. ` +
      `Cover the offer for viewers, not the broadcast rig?`
    );
  }
  if (hook === "seeding") {
    return (
      `Hi ${creator} — we plan hardware seeding by shipping address, not language. ` +
      `Your ${niche} work is in ${marketEn}. ${brand} ${productEn} include warranty and land ~20% under new. Worth a look?`
    );
  }
  return (
    `Hi ${creator} — your ${niche} videos reach people who buy hardware in ${marketEn}. ` +
    `${brand} sells ${productEn} with warranty, typically ~20% under new retail — not a private listing. Open to a collab?`
  );
}

function germanPitch(hook: PitchHook, slots: Slots): string {
  const { creator, niche, market, brand, productDe } = slots;
  if (hook === "value") {
    return (
      `Hallo ${creator} — du machst bereits Gebraucht- und Preis-Leistungsthemen. ` +
      `${brand} ${productDe} passen: Garantie, unter Neupreis. ` +
      `Wir seeden nur an eine ${market}-Adresse, wenn die Story sitzt.`
    );
  }
  if (hook === "audience") {
    return (
      `Hallo ${creator} — dein ${niche}-Publikum kauft weiter Value-Hardware, auch wenn der Stream-PC neu ist. ` +
      `${brand} ${productDe} mit Garantie, ~20% unter Neupreis, Seed nach ${market}. ` +
      `Angebot für die Zuschauer, nicht fürs Broadcast-Rig?`
    );
  }
  if (hook === "seeding") {
    return (
      `Hallo ${creator} — Seeding folgt der Lieferadresse, nicht nur der Sprache. ` +
      `Dein ${niche}-Kanal ist in ${market}. ${brand} ${productDe} mit Garantie, rund 20% unter Neu. Interesse?`
    );
  }
  return (
    `Hallo ${creator} — dein ${niche}-Content trifft Käufer in ${market}. ` +
    `${brand} verkauft ${productDe} mit Garantie, oft ~20% unter Neupreis — nicht Kleinanzeigen. Lust auf eine Kollabo?`
  );
}

function finnishPitch(hook: PitchHook, slots: Slots): string {
  const { creator, niche, market, brand, productFi } = slots;
  if (hook === "value") {
    return (
      `Hei ${creator} — teet jo kunnostettu- ja hinta-laatu -sisältöä. ` +
      `${brand} ${productFi} sopivat: takuu, alle uuden hinnan. ` +
      `Voidaan seedata ${market}-osoitteeseen, jos kulma sopii.`
    );
  }
  if (hook === "audience") {
    return (
      `Hei ${creator} — ${niche}-yleisösi ostaa yhä edullista rautaa, vaikka stream-kone olisi uusi. ` +
      `${brand} ${productFi} takuulla, ~20% alle uuden, seedaus markkinalle ${market}. ` +
      `Juttu katsojille, ei broadcast-rigille?`
    );
  }
  if (hook === "seeding") {
    return (
      `Hei ${creator} — seedaus menee toimitusosoitteen, ei kielen mukaan. ` +
      `${niche}-kanavasi on markkinalla ${market}. ${brand} ${productFi} takuulla, ~20% alle uuden. Kiinnostaako?`
    );
  }
  return (
    `Hei ${creator} — ${niche}-sisältösi osuu ostajiin markkinalla ${market}. ` +
    `${brand} myy ${productFi} takuulla, noin 20% alle uuden hinnan — ei Tori-kauppaa. Kiinnostaisiko yhteistyö?`
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
