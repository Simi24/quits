// Renders the maskable PNGs of the app icon from public/icon-maskable.svg (SPEC.md §7.4). Run by hand after
// the mark changes; the PNGs are committed. Uses the Chromium Playwright already installs, so no new dependency.
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const SOURCE = readFileSync(new URL("../public/icon-maskable.svg", import.meta.url), "utf8");
const TARGETS = [
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  // iOS draws its own corners on the Home Screen icon: full bleed, no transparency.
  { file: "apple-touch-icon.png", size: 180 },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const { file, size } of TARGETS) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>html,body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${SOURCE}`);
  writeFileSync(new URL(`../public/${file}`, import.meta.url), await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: size, height: size } }));
}
await browser.close();
