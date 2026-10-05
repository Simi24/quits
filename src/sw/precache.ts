/** An entry of the build's precache list: hashed files carry no revision, the others do. */
export interface PrecacheEntry {
  url: string;
  revision: string | null;
}

const PREFIX = "quits-shell-";

/** A cache name that changes whenever the list or any revision does, so a new build gets a clean cache. */
export const cacheNameFor = (entries: PrecacheEntry[]): string => {
  let hash = 0;
  for (const char of entries.map((e) => `${e.url}@${e.revision ?? ""}`).join("|")) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) | 0;
  return `${PREFIX}${(hash >>> 0).toString(36)}`;
};

export const isShellCache = (name: string): boolean => name.startsWith(PREFIX);

/**
 * What to fetch into the cache. The shell is cached as "/": the platform redirects `/index.html` to it, and a
 * redirected response cannot answer a navigation. The build lists some files twice (the icons come from
 * `public/` and from the manifest) and a cache refuses a batch with duplicates.
 */
export const precacheUrls = (entries: PrecacheEntry[]): string[] => [...new Set(entries.map((entry) => (entry.url === "index.html" ? "/" : entry.url)))];
