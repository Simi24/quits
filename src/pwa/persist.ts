/** Asks the browser not to evict our storage. Never relied on: the answer can be no, and the server holds the trip (SPEC.md §5.2). */
export const requestPersist = (): void => {
  void navigator.storage?.persist?.().catch(() => false);
};
