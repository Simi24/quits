import type { Dictionary, Lang } from "./dictionary";
import { en } from "./en";
import { it } from "./it";

export const dictionaries: Record<Lang, Dictionary> = { it, en };

/** Italian for Italian browsers, English for everything else (SPEC.md §17 G-B7, decided here). */
export const detectLang = (browserLanguage: string): Lang => (browserLanguage.toLowerCase().startsWith("it") ? "it" : "en");
