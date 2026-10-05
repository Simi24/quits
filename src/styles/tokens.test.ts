import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

/** Custom properties declared in a CSS body, as name -> value. */
const declarations = (body: string): Record<string, string> =>
  Object.fromEntries(
    [...body.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [
      m[1] as string,
      (m[2] as string).trim(),
    ]),
  );

/** The body of the first rule whose selector line contains `selector` (no nested braces). */
const ruleBody = (css: string, selector: string): string => {
  const start = css.indexOf(selector);
  if (start === -1) throw new Error(`selector not found: ${selector}`);
  const open = css.indexOf("{", start);
  return css.slice(open + 1, css.indexOf("}", open));
};

const spec = read("../../SPEC.md");
const specCss = spec.slice(spec.indexOf("### 7.2 Tokens")).match(/```css\n([\s\S]*?)```/)?.[1] ?? "";
const tokens = read("./tokens.css");

const specLight = declarations(ruleBody(specCss, ":root {"));
const specDark = declarations(ruleBody(specCss, ':root[data-theme="dark"]'));

describe("design tokens", () => {
  it("light theme matches SPEC.md §7.2", () => {
    expect(declarations(ruleBody(tokens, ":root {"))).toEqual(specLight);
  });

  it("dark theme under data-theme matches SPEC.md §7.2", () => {
    const dark = declarations(ruleBody(tokens, ':root[data-theme="dark"]'));
    expect(dark).toEqual(specDark);
  });

  it("dark theme follows the system unless light is forced, with the same values", () => {
    const media = tokens.slice(tokens.indexOf("@media (prefers-color-scheme: dark)"));
    const dark = declarations(ruleBody(media, ':root:not([data-theme="light"])'));
    expect(dark).toEqual(specDark);
  });

  it("no token is left without a dark value that the spec defines", () => {
    for (const name of Object.keys(specDark)) expect(specLight).toHaveProperty(name);
  });
});
