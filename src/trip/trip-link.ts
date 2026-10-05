/** The link to share: the token lives in the fragment, which never reaches the server (SPEC.md §4). */
export const tripLinkOf = (token: string, origin: string = window.location.origin): string => `${origin}/v/#${token}`;

