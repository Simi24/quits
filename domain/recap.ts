import { suggestSettlements } from "./balances.ts";
import type { ParticipantId } from "./ids.ts";
import { tripTotals } from "./totals.ts";
import type { Trip } from "./trip.ts";

type RecapLang = "it" | "en";

const COPY = {
  it: { pay: "Pagamenti per andare pari:", even: "Siamo tutti pari.", total: "Totale del viaggio:", open: "Apri il viaggio:" },
  en: { pay: "Payments to settle up:", even: "Everyone is settled up.", total: "Trip total:", open: "Open the trip:" },
} as const;

export type RecapInput = {
  trip: Trip;
  lang: RecapLang;
  /** The app's money formatter, so amounts read exactly as on screen. */
  money: (minor: number) => string;
  /** The trip link; null when the device has none, and the last line is left out. */
  link: string | null;
  /** Extra lines for a creditor (e.g. how to pay them), added after the payments. Unused for now. */
  extraLines?: (creditorId: ParticipantId) => string[];
};

/** The settle-up recap as plain text to paste in a chat: the current suggested settlements, the trip total and the link (SPEC.md §7.6 item 8). */
export function buildRecap({ trip, lang, money, link, extraLines }: RecapInput): string {
  const copy = COPY[lang];
  const nameOf = (id: ParticipantId) => trip.participants.find((p) => p.id === id)?.name ?? id;
  const suggestions = suggestSettlements(trip);
  const creditors = [...new Set(suggestions.map((s) => s.toParticipantId))];
  const lines = [`Quits · ${trip.name}`];
  if (suggestions.length === 0) {
    lines.push(copy.even);
  } else {
    lines.push(copy.pay);
    for (const s of suggestions) lines.push(`• ${nameOf(s.fromParticipantId)} → ${nameOf(s.toParticipantId)}: ${money(s.amount)}`);
    for (const id of creditors) lines.push(...(extraLines?.(id) ?? []));
  }
  lines.push(`${copy.total} ${money(tripTotals(trip).total)}`);
  if (link) lines.push(`${copy.open} ${link}`);
  return lines.join("\n");
}
