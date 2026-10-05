import { describe, expect, it } from "vitest";
import { isInAppBrowser, isIos } from "./platform";

const IPHONE_SAFARI = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const IPAD_AS_MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
const ANDROID_CHROME = "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const INSTAGRAM = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0";
const TELEGRAM = "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.0.0 Mobile Safari/537.36 Telegram-Android/11.0";
const WHATSAPP = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 WhatsApp/24.20";

describe("isIos", () => {
  it("knows an iPhone", () => expect(isIos(IPHONE_SAFARI, 5)).toBe(true));
  it("knows an iPad that reports itself as a Mac, by its touch screen", () => {
    expect(isIos(IPAD_AS_MAC, 5)).toBe(true);
    expect(isIos(IPAD_AS_MAC, 0)).toBe(false);
  });
  it("does not take Android for iOS", () => expect(isIos(ANDROID_CHROME, 5)).toBe(false));
});

describe("isInAppBrowser, a web view inside a messaging or social app", () => {
  it.each([
    ["Instagram", INSTAGRAM],
    ["Telegram", TELEGRAM],
    ["WhatsApp", WHATSAPP],
    ["Facebook", "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36 [FBAN/FB4A;FBAV/450.0.0.0;]"],
    ["Line", "Mozilla/5.0 (iPhone) Mobile/15E148 Safari Line/14.0"],
  ])("recognises %s", (_name, ua) => expect(isInAppBrowser(ua)).toBe(true));

  it.each([
    ["Safari", IPHONE_SAFARI],
    ["Chrome", ANDROID_CHROME],
  ])("leaves %s alone", (_name, ua) => expect(isInAppBrowser(ua)).toBe(false));
});
