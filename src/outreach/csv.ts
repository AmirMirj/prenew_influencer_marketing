import { MAX_PITCH_LENGTH } from "@/src/outreach/pitch";
import type { ShortlistItem } from "@/src/domain/types";

export const CSV_HEADERS = [
  "handle",
  "platform",
  "market",
  "followers",
  "fit",
  "hiddenGem",
  "contact",
  "pitch_local",
  "pitch_en",
] as const;

export function shortlistToCsv(items: ShortlistItem[]): string {
  const rows = [
    CSV_HEADERS.join(","),
    ...items.map((item) =>
      [
        item.handle,
        item.platform,
        item.market,
        String(item.followerCount),
        String(item.fit.total),
        item.fit.hiddenGem ? "true" : "false",
        item.contact.status === "missing" ? "" : (item.contact.value ?? ""),
        clipPitch(item.suggestedPitch.local),
        clipPitch(item.suggestedPitch.en),
      ]
        .map(csvCell)
        .join(","),
    ),
  ];
  return rows.join("\n");
}

function clipPitch(text: string): string {
  if (text.length <= MAX_PITCH_LENGTH) {
    return text;
  }
  return `${text.slice(0, MAX_PITCH_LENGTH - 1)}…`;
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
