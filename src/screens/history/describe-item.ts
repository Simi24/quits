import { hasPaymentDetails } from "../../../domain";
import type { Operation, Trip } from "../../../domain";
import type { Dictionary } from "../../i18n";
import type { HistoryItem } from "../../history";

interface Words {
  t: Dictionary;
  trip: Trip;
  nameOf: (participantId: string) => string;
  money: (minor: number) => string;
  /** The log, to find the name of a category that has since been deleted. */
  operations: Operation[];
}

/** What a history line says after the author's name (prototype keys `h_*`, SPEC.md §3.15). */
export function describeItem(item: HistoryItem, { t, trip, nameOf, money, operations }: Words): string {
  const h = t.history;
  const { op } = item;
  const expenseName = (id: string) => `"${trip.expenses.find((e) => e.id === id)?.snapshot.description ?? ""}"`;
  const settlement = (id: string) => trip.settlements.find((s) => s.id === id);
  const settlementWords = (id: string, say: (amount: string, to: string) => string) => {
    const s = settlement(id);
    return s ? say(money(s.amount), nameOf(s.toParticipantId)) : "";
  };
  const merged = (opId: string) => {
    const m = trip.merges.find((x) => x.opId === opId);
    return m ? ([nameOf(m.fromParticipantId), nameOf(m.intoParticipantId)] as const) : (["?", "?"] as const);
  };
  switch (op.type) {
    case "TripCreated":
      return h.h_create;
    case "TripRenamed":
      return h.h_tripRename(op.name);
    case "TripDatesChanged":
      return h.h_dates;
    case "TripCurrencyChanged":
      return h.h_currency(op.currency);
    case "DefaultSplitChanged":
      return h.h_dsplit;
    case "TripClosed":
      return h.h_close;
    case "TripReopened":
      return h.h_reopen;
    case "LinkRegenerated":
      return h.h_regen;
    case "TripDeleted":
      return h.h_deleteTrip;
    case "TripRestored":
      return h.h_restoreTrip;
    case "ParticipantAdded":
      return h.h_person(op.name);
    case "ParticipantRenamed":
      return h.h_rename(item.previousName ?? "", op.name);
    case "ParticipantRemoved":
      return h.h_personRemoved(nameOf(op.participantId));
    case "ParticipantsMerged":
      return h.h_merge(nameOf(op.fromParticipantId), nameOf(op.intoParticipantId));
    case "MergeUndone":
      return h.h_mergeUndone(...merged(op.mergeOpId));
    case "ParticipantPaymentDetailsSet": {
      const cleared = !hasPaymentDetails(op.details);
      const other = op.participantId === item.by ? null : nameOf(op.participantId);
      if (other === null) return cleared ? t.payment.hCleared : t.payment.hSet;
      return cleared ? t.payment.hClearedFor(other) : t.payment.hSetFor(other);
    }
    case "ExpenseCreated":
      return h.h_add(expenseName(op.expenseId));
    case "ExpenseEdited":
      return item.conflict ? h.h_conflict(expenseName(op.expenseId)) : h.h_edit(expenseName(op.expenseId));
    case "ExpenseDeleted":
      return h.h_del(expenseName(op.expenseId));
    case "ExpenseRestored":
      return h.h_restore(expenseName(op.expenseId));
    case "SettlementRecorded":
      return h.h_set(money(op.amount), nameOf(op.toParticipantId));
    case "SettlementDeleted":
      return settlementWords(op.settlementId, h.h_setdel);
    case "SettlementRestored":
      return settlementWords(op.settlementId, h.h_setrestore);
    case "CategoryAdded":
      return h.h_cat(`${op.emoji} ${op.name}`.trim());
    case "CategoryRenamed":
      return h.h_catrename(`${op.emoji} ${op.name}`.trim());
    case "CategoryDeleted":
      return h.h_catdel(lastCategoryName(operations, op.categoryId));
  }
}

/** The name a category had when it was last written (it may be deleted by now). */
function lastCategoryName(operations: Operation[], categoryId: string): string {
  for (const op of [...operations].reverse()) {
    if ((op.type === "CategoryAdded" || op.type === "CategoryRenamed") && op.categoryId === categoryId) return `${op.emoji} ${op.name}`.trim();
  }
  return "";
}
