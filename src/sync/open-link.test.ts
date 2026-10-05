import { describe, expect, it } from "vitest";
import { tripCreated } from "../../domain/testing";
import { openLink } from "./open-link";
import { deletion, FakeServer } from "./testing/fake-server";
import { MemoryStore } from "./testing/memory-store";

const setup = () => {
  const server = new FakeServer();
  const store = new MemoryStore();
  store.token = null;
  return { server, store, open: (token: string) => openLink({ token, store, api: server.api }) };
};

describe("openLink", () => {
  it("a link the device has never seen starts a new trip and brings its log in", async () => {
    const { server, store, open } = setup();
    server.external(tripCreated());

    const outcome = await open("fresh-token");

    expect(outcome).toEqual({ status: "opened", tripId: "trip-1", isNew: true });
    expect(store.adopted).toEqual([{ tripId: "trip-1", token: "fresh-token" }]);
    expect(store.confirmedLog()).toHaveLength(1);
  });

  it("the token of a trip already on the device opens it without asking the server", async () => {
    const { server, store, open } = setup();
    store.tripIds.add("trip-1");
    store.token = "known";

    expect(await open("known")).toEqual({ status: "opened", tripId: "trip-1", isNew: false });
    expect(server.pullCalls).toEqual([]);
  });

  it("a new link of a trip already on the device swaps the token, and the queued operations go out through it", async () => {
    const { server, store, open } = setup();
    store.tripIds.add("trip-1");
    store.token = "old-token";
    store.access = "link_changed";
    store.write(tripCreated());

    const outcome = await open("new-token");

    expect(outcome).toEqual({ status: "opened", tripId: "trip-1", isNew: false });
    expect(store.token).toBe("new-token");
    expect(store.access).toBe("ok");
    expect(store.outbox).toEqual([]);
    expect(server.log.map((e) => e.operation.id)).toEqual(["created"]);
  });

  it("a retired link says the link changed and starts nothing", async () => {
    const { server, store, open } = setup();
    server.failure = { kind: "link_changed", tripId: "trip-1" };

    expect(await open("old")).toEqual({ status: "link_changed" });
    expect(store.adopted).toEqual([]);
  });

  it("a deleted trip is reported with who deleted it and until when, and kept off the device", async () => {
    const { server, store, open } = setup();
    server.failure = { kind: "deleted", tripId: "trip-1", deletion };

    expect(await open("tok")).toEqual({ status: "deleted", tripId: "trip-1", deletion });
    expect(store.adopted).toEqual([]);
  });

  it("a new link of a trip on the device that is deleted marks that trip deleted", async () => {
    const { server, store, open } = setup();
    store.tripIds.add("trip-1");
    store.token = "old-token";
    server.failure = { kind: "deleted", tripId: "trip-1", deletion };

    await open("new-token");

    expect(store.token).toBe("new-token");
    expect(store).toMatchObject({ access: "deleted", deletion });
  });

  it("a purged trip is unavailable", async () => {
    const { server, open } = setup();
    server.failure = { kind: "unavailable" };

    expect(await open("tok")).toEqual({ status: "unavailable" });
  });

  it("with no connection an unknown link cannot be opened yet", async () => {
    const { server, open } = setup();
    server.failure = { kind: "offline" };

    expect(await open("tok")).toEqual({ status: "offline" });
  });
});
