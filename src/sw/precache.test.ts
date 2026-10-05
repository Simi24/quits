import { describe, expect, it } from "vitest";
import { cacheNameFor, precacheUrls } from "./precache";

const entry = (url: string, revision: string | null = null) => ({ url, revision });

describe("the precache list", () => {
  it("fetches the shell as the root, not as index.html", () => {
    expect(precacheUrls([entry("index.html", "a"), entry("assets/app.js")])).toEqual(["/", "assets/app.js"]);
  });

  it("names each file once even when the build lists it twice", () => {
    expect(precacheUrls([entry("icon.svg", "x"), entry("assets/app.js"), entry("icon.svg", "x")])).toEqual(["icon.svg", "assets/app.js"]);
  });

  it("gives a new build a new cache name, and the same build the same one", () => {
    const build = [entry("index.html", "a"), entry("assets/app-1.js")];
    expect(cacheNameFor(build)).toBe(cacheNameFor([...build]));
    expect(cacheNameFor(build)).not.toBe(cacheNameFor([entry("index.html", "b"), entry("assets/app-1.js")]));
  });
});
