import type { it } from "./it";

type Widen<T> = T extends string
  ? string
  : T extends (...args: infer A) => string
    ? (...args: A) => string
    : { [K in keyof T]: Widen<T[K]> };

/** Every string of the interface, per area. Italian is the shape; English must provide the same keys. */
export type Dictionary = Widen<typeof it>;
export type Lang = "it" | "en";
