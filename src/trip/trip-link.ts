/** The link to share: the token lives in the fragment, which never reaches the server (SPEC.md §4). */
export const tripLinkOf = (token: string, origin: string = window.location.origin): string => `${origin}/v/#${token}`;


/** The token of a trip link in the address bar (`/v/#<token>`); empty when the page is not one. */
export const tokenInAddressBar = (): string => (window.location.pathname.startsWith("/v") ? window.location.hash.slice(1) : "");
