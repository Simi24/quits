interface FirstTipState {
  /** True once the tip was dismissed or the first expense was recorded on this device. */
  tipSeen: boolean;
  readOnly: boolean;
}

/** The one contextual tip beside "+": once per device, and never on a closed trip, which has no "+" (SPEC.md §7.6 item 18). */
export const firstTipVisible = ({ tipSeen, readOnly }: FirstTipState): boolean => !tipSeen && !readOnly;
