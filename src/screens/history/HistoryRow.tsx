import { ArrowUUpLeft, CloudSlash, Lock, Warning } from "@phosphor-icons/react";
import { Avatar, Button } from "../../components";
import { useDevice } from "../../device";
import { instantTime } from "../../format";
import type { HistoryAction, HistoryItem } from "../../history";
import { avatarIndex, useTrip } from "../../trip";
import { describeItem } from "./describe-item";

interface HistoryRowProps {
  item: HistoryItem;
  onAct: (action: HistoryAction) => void;
}

const MARK = "inline-flex items-center gap-1 rounded-full bg-paper-2 px-2 py-0.5 text-[12.5px] font-bold";

/** One line of the history: author, what happened, time, the marks of §3.15 and the action it offers. */
export const HistoryRow = ({ item, onAct }: HistoryRowProps) => {
  const { t, lang } = useDevice();
  const { trip, nameOf, money, operations, readOnly } = useTrip();
  const h = t.history;
  const author = trip.roster.find((r) => r.id === item.by);
  const action = item.action;
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 py-3 [&+&]:border-t-[1.5px] [&+&]:border-line" data-testid="history-row" data-op-type={item.op.type}>
      <Avatar name={author?.name ?? "?"} index={avatarIndex(trip, item.by)} size="sm" />
      <div className="grid min-w-0 gap-1.5">
        <p>
          <b>{nameOf(item.by)}</b> {describeItem(item, { t, trip, nameOf, money, operations })}
        </p>
        <time dateTime={item.at} className="num text-[13px] text-ink-2">
          {instantTime(item.at, lang)}
        </time>
        <div className="flex flex-wrap items-center gap-1.5 empty:hidden">
          {item.rejected ? (
            <span className={MARK} data-testid="mark-unsent">
              <CloudSlash size={14} weight="fill" className="text-neg" aria-hidden="true" />
              {h.unsent}
            </span>
          ) : null}
          {item.afterClose ? (
            <span className={MARK} data-testid="mark-after-close">
              <Lock size={14} weight="fill" aria-hidden="true" />
              {h.afterClose}
            </span>
          ) : null}
          {item.conflict ? (
            <span className={MARK}>
              <Warning size={14} weight="fill" aria-hidden="true" />
              {h.conflictMark}
            </span>
          ) : null}
          {item.pending ? <span className={MARK}>{h.waiting}</span> : null}
        </div>
        {item.rejected ? <p className="text-[13.5px] text-ink-2">{h.unsentWhy(item.rejected.reason)}</p> : null}
        {item.ignored ? <p className="text-[13.5px] text-ink-2">{h.ignored(item.ignored)}</p> : null}
        {action && !readOnly ? (
          <div>
            <Button size="sm" variant="ghost" onClick={() => onAct(action)}>
              <ArrowUUpLeft size={18} weight="bold" aria-hidden="true" />
              {action.kind === "undo-merge" ? h.undoMerge : h.restore}
            </Button>
          </div>
        ) : null}
      </div>
    </li>
  );
};
