// Test helpers only. The creator code the test Worker's CREATOR_CODES secret holds (see vitest.config.ts).
export const ALICE_CODE = "q-7M3K9P2X4T8R5W1ZB6HC";
export const ALICE_LABEL = "alice";
/** A well-formed code that is not in the secret: a wrong or a revoked one. */
export const REVOKED_CODE = "q-0000000000000000000A";
