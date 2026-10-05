/** A field of an untrusted JSON value: undefined unless the value is an object. */
export const fieldOf = (value: unknown, key: string): unknown =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>)[key] : undefined;
