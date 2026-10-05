import type { Page } from "@playwright/test";

/**
 * Aborts every request that leaves the local server and records it, so a test
 * can assert that nothing tried to (SPEC.md §7.3: no Google Fonts at runtime).
 */
export const blockExternalRequests = async (page: Page, baseURL: string): Promise<string[]> => {
  const blocked: string[] = [];
  const origin = new URL(baseURL).origin;
  await page.route("**/*", (route) => {
    const url = route.request().url();
    if (url.startsWith(origin) || url.startsWith("data:") || url.startsWith("blob:")) {
      return route.continue();
    }
    blocked.push(url);
    return route.abort();
  });
  return blocked;
};
