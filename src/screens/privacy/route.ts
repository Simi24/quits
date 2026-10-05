/** Where the privacy page lives (SPEC.md §10.2, G-B7). A plain path: the page needs no trip and no token. */
export const PRIVACY_PATH = "/privacy";

export const isPrivacyPath = (pathname: string): boolean => pathname === PRIVACY_PATH || pathname === `${PRIVACY_PATH}/`;
