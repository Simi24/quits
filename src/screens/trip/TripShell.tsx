import { lazy, Suspense, useState } from "react";
import type { SuggestedSettlement } from "../../../domain";
import { Toast, useSingleFlight } from "../../components";
import { useDevice } from "../../device";
import { todayIso } from "../../format";
import { useTrip } from "../../trip";
import type { OperationPayload } from "../../trip";
import { ExpenseDetail, ExpenseSheet } from "../expense";
import { SaldiScreen, SettlementDetail, SettlementSheet } from "../saldi";
import { SpeseScreen } from "../spese";
import { ViaggioScreen } from "../viaggio";
import { WhoAreYou } from "../who";
import { Fab } from "./Fab";
import { TabBar } from "./TabBar";
import type { Tab } from "./TabBar";
import { TripBar } from "./TripBar";
import { useToast } from "./useToast";

// The charts and their library load when the tab is first opened; the service worker precaches the chunk, so it works offline.
const GraficiScreen = lazy(() => import("../grafici").then((m) => ({ default: m.GraficiScreen })));

type OpenSheet =
  | { kind: "expense"; editingId: string | null }
  | { kind: "settle"; prefill: SuggestedSettlement | null }
  | { kind: "settlement"; id: string };

interface TripShellProps {
  onLeave: () => void;
}

/** The trip: bar, the four tabs, the expense detail over them, sheets and toasts (SPEC.md §7.5). */
export const TripShell = ({ onLeave }: TripShellProps) => {
  const { t } = useDevice();
  const { trip, record, recordMany } = useTrip();
  const [tab, setTab] = useState<Tab>("spese");
  const [choosingWho, setChoosingWho] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [sheet, setSheetState] = useState<OpenSheet | null>(null);
  const [printId, setPrintId] = useState<string | null>(null);
  const { toast, show, hide } = useToast();

  // A toast never sits on top of a sheet that has just opened.
  const setSheet = (next: OpenSheet | null) => {
    if (next) hide();
    setSheetState(next);
  };

  // One transaction for every suggestion, once: a double tap must not pay anyone twice.
  const settleAll = useSingleFlight(async (suggestions: SuggestedSettlement[]) => {
    const date = todayIso();
    await recordMany(
      suggestions.map((s) => ({
        type: "SettlementRecorded",
        settlementId: crypto.randomUUID(),
        fromParticipantId: s.fromParticipantId,
        toParticipantId: s.toParticipantId,
        amount: s.amount,
        date,
      })),
    );
    show({ text: t.balances.recordedAll });
  });

  if (choosingWho) return <WhoAreYou onDone={() => setChoosingWho(false)} />;

  const detail = detailId ? trip.expenses.find((e) => e.id === detailId && !e.deleted) : undefined;
  const editing = sheet?.kind === "expense" && sheet.editingId ? trip.expenses.find((e) => e.id === sheet.editingId) : undefined;
  const openedSettlement = sheet?.kind === "settlement" ? trip.settlements.find((s) => s.id === sheet.id && !s.deleted) : undefined;

  /** "Annulla" after a delete: the toast goes at the first tap, so the restore is written once. */
  const offerUndo = (text: string, restore: OperationPayload, restoredText: string) =>
    show({
      text,
      action: {
        label: t.shell.undo,
        run: () => {
          hide();
          void record(restore).then(() => show({ text: restoredText }));
        },
      },
    });

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-paper">
      <TripBar onLeave={onLeave} onWho={() => setChoosingWho(true)} />
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {tab === "spese" ? (
          <SpeseScreen printId={printId} onOpenExpense={setDetailId} onOpenSettlement={(id) => setSheet({ kind: "settlement", id })} />
        ) : null}
        {tab === "saldi" ? <SaldiScreen onRecord={(prefill) => setSheet({ kind: "settle", prefill })} onRecordAll={(s) => void settleAll.run(s)} /> : null}
        {tab === "grafici" ? (
          <Suspense fallback={null}>
            <GraficiScreen />
          </Suspense>
        ) : null}
        {tab === "viaggio" ? <ViaggioScreen onNotMe={() => setChoosingWho(true)} notify={(text) => show({ text })} /> : null}
      </main>
      {tab === "spese" ? <Fab label={t.expenses.newExpense} onClick={() => setSheet({ kind: "expense", editingId: null })} /> : null}
      <TabBar
        tab={tab}
        onChange={(next) => {
          setPrintId(null);
          setTab(next);
        }}
      />

      {detail ? (
        <ExpenseDetail
          expense={detail}
          onClose={() => setDetailId(null)}
          onEdit={() => setSheet({ kind: "expense", editingId: detail.id })}
          onDeleted={(expenseId) => {
            setDetailId(null);
            offerUndo(t.expenses.deleted, { type: "ExpenseRestored", expenseId }, t.expenses.restoredExp);
          }}
        />
      ) : null}

      {sheet?.kind === "expense" && (sheet.editingId === null || editing) ? (
        <ExpenseSheet
          editing={editing ?? null}
          onClose={() => setSheet(null)}
          onSaved={(expenseId, created) => {
            setSheet(null);
            if (created) setPrintId(expenseId);
            show({ text: created ? t.expenses.saved : t.expenses.savedEdit });
          }}
        />
      ) : null}
      {sheet?.kind === "settle" ? (
        <SettlementSheet
          prefill={sheet.prefill}
          onClose={() => setSheet(null)}
          onSaved={() => {
            setSheet(null);
            show({ text: t.balances.recorded });
          }}
        />
      ) : null}
      {openedSettlement ? (
        <SettlementDetail
          settlement={openedSettlement}
          onClose={() => setSheet(null)}
          onDeleted={(settlementId) => {
            setSheet(null);
            offerUndo(t.balances.setDeleted, { type: "SettlementRestored", settlementId }, t.balances.setRestored);
          }}
        />
      ) : null}
      {toast ? <Toast text={toast.text} action={toast.action} /> : null}
    </div>
  );
};
