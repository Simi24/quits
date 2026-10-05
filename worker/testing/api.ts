// Test helpers only: the HTTP API as a client sees it.
import { exports } from "cloudflare:workers";
import { tripCreated } from "../../domain/testing.ts";
import { ALICE_CODE } from "./fixtures.ts";

type Options = { auth?: string; body?: unknown; query?: string };

export async function api(method: string, path: string, { auth, body, query = "" }: Options = {}) {
  const headers = new Headers();
  if (auth) headers.set("Authorization", auth);
  const response = await exports.default.fetch(`https://quits.test${path}${query}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, headers: response.headers, body: text ? JSON.parse(text) : null };
}

/** A trip as a creator makes it: its id, its token and the sequence of its first operation. */
export async function newTrip() {
  const { status, body } = await api("POST", "/api/trips", { auth: `Creator ${ALICE_CODE}`, body: { operation: tripCreated() } });
  if (status !== 201) throw new Error(`creating a trip answered ${status}`);
  return body as { tripId: string; token: string; seq: number };
}

export const bearer = (token: string) => `Bearer ${token}`;
