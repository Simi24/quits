import { describe, expect, it } from "vitest";
import { expenseCreated, op, tripCreated } from "../../domain/testing";
import type { Operation } from "../../domain";
import { syncTrip } from "./sync-trip";
import { deletion, FakeServer } from "./testing/fake-server";
import { MemoryStore } from "./testing/memory-store";

const setup = () => {
  const server = new FakeServer();
  const store = new MemoryStore();
  const run = () => syncTrip({ tripId: "trip-1", store, api: server.api });
  return { server, store, run };
};

describe("syncTrip", () => {
  it("pushes the outbox and pulls the log, leaving the outbox empty and the cursor at the end", async () => {
    const { server, store, run } = setup();
    store.write(tripCreated(), expenseCreated("e1"));

    const outcome = await run();

    expect(outcome).toMatchObject({ status: "synced", pushed: 2 });
    expect(store.outbox).toEqual([]);
    expect(store.confirmedLog().map((e) => e.operation.id)).toEqual(["created", "create-e1"]);
    expect(store.lastSeq).toBe(2);
    expect(server.log).toHaveLength(2);
  });

  it("two rounds at once, the page's and the service worker's, lose nothing and log each operation once", async () => {
    const { server, store, run } = setup();
    store.write(tripCreated(), expenseCreated("e1"));

    const both = Promise.all([run(), run()]);
    store.write(expenseCreated("e2"));
    await both;
    await run();

    const ids = ["created", "create-e1", "create-e2"];
    expect(server.log.map((e) => e.operation.id)).toEqual(ids);
    expect(store.confirmedLog().map((e) => e.operation.id)).toEqual(ids);
    expect(store.outbox).toEqual([]);
    expect(store.rejected).toEqual([]);
  });

  it("sends a long outbox in chunks of at most 100, in order", async () => {
    const { server, store, run } = setup();
    const many = Array.from({ length: 250 }, (_, i) => op({ type: "TripRenamed", name: `Nome ${i}` }, { id: `r-${i}` }));
    store.write(...many);

    await run();

    expect(server.pushCalls.map((call) => call.length)).toEqual([100, 100, 50]);
    expect(server.log.map((e) => e.operation.id)).toEqual(many.map((o) => o.id));
    expect(store.outbox).toEqual([]);
  });

  it("a retried push creates no duplicates: an operation the server already has is cleared from the outbox", async () => {
    const { server, store, run } = setup();
    const created = tripCreated();
    server.external(created);
    store.write(created);

    await run();

    expect(server.log).toHaveLength(1);
    expect(store.outbox).toEqual([]);
    expect(store.confirmedLog()).toHaveLength(1);
  });

  it("a rejected operation goes to the rejected store alone, the rest of its batch is stored, and it is never sent again", async () => {
    const { server, store, run } = setup();
    const malformed = op({ type: "TripRenamed", name: "" }, { id: "bad" });
    store.write(expenseCreated("e1"), malformed, expenseCreated("e2"));

    const outcome = await run();
    await run();

    expect(outcome).toMatchObject({ status: "synced", pushed: 2, rejected: 1 });
    expect(store.rejected.map((r) => r.operation.id)).toEqual(["bad"]);
    expect(store.rejected[0]?.reason).toBe("malformed");
    expect(server.log.map((e) => e.operation.id)).toEqual(["create-e1", "create-e2"]);
    expect(server.pushCalls).toHaveLength(1);
  });

  it("pulls page after page while the server says there is more", async () => {
    const { server, store, run } = setup();
    server.pageSize = 2;
    for (let i = 0; i < 5; i++) server.external(op({ type: "TripRenamed", name: `N${i}` }, { id: `x${i}` }));

    await run();

    expect(server.pullCalls).toEqual([0, 2, 4]);
    expect(store.confirmedLog()).toHaveLength(5);
    expect(store.lastSeq).toBe(5);
  });

  it("pulls only what is after the cursor", async () => {
    const { server, store, run } = setup();
    server.external(op({ type: "TripRenamed", name: "A" }, { id: "x1" }));
    await run();
    server.external(op({ type: "TripRenamed", name: "B" }, { id: "x2" }));

    await run();

    expect(server.pullCalls).toEqual([0, 1]);
    expect(store.lastSeq).toBe(2);
  });

  it("an operation this version cannot read is asked for again on the next round, so an updated app still folds it", async () => {
    const { server, store, run } = setup();
    server.external(op({ type: "TripRenamed", name: "A" }, { id: "x1" }));
    server.external({ ...op({ type: "TripRenamed", name: "B" }, { id: "from-the-future" }), v: 99 } as unknown as Operation);
    server.external(op({ type: "TripRenamed", name: "C" }, { id: "x3" }));

    await run();
    await run();

    expect(store.confirmedLog().map((e) => e.operation.id)).toEqual(["x1", "x3"]);
    expect(store.lastSeq).toBe(1);
    expect(server.pullCalls).toEqual([0, 1]);
  });

  it("offline: the outbox stays as it is", async () => {
    const { server, store, run } = setup();
    server.failure = { kind: "offline" };
    store.write(expenseCreated("e1"));

    const outcome = await run();

    expect(outcome.status).toBe("offline");
    expect(store.outbox).toHaveLength(1);
  });

  it("410 link_changed: stops, keeps the outbox and remembers the link is old", async () => {
    const { server, store, run } = setup();
    server.failure = { kind: "link_changed", tripId: "trip-1" };
    store.write(expenseCreated("e1"));

    const outcome = await run();

    expect(outcome.status).toBe("link_changed");
    expect(store.access).toBe("link_changed");
    expect(store.outbox).toHaveLength(1);
    // No further requests while the old link is all the device has.
    server.failure = null;
    expect((await run()).status).toBe("link_changed");
    expect(server.pushCalls).toHaveLength(1);
  });

  it("an answer about a token the device has meanwhile replaced does not mark the new link as old", async () => {
    const { server, store } = setup();
    store.write(expenseCreated("e1"));
    // This device regenerates the link while a round with the old token is in flight.
    const api = {
      ...server.api,
      push: async () => {
        await store.adoptTrip("trip-1", "token-2");
        return { kind: "link_changed" as const, tripId: "trip-1" };
      },
    };

    await syncTrip({ tripId: "trip-1", store, api });

    expect(store.access).toBe("ok");
    expect(store.outbox).toHaveLength(1);
    expect((await syncTrip({ tripId: "trip-1", store, api: server.api })).status).toBe("synced");
  });

  it("410 trip_deleted: keeps the outbox and the deletion, and pushes it all once the trip is restored", async () => {
    const { server, store, run } = setup();
    server.failure = { kind: "deleted", tripId: "trip-1", deletion };
    store.write(expenseCreated("e1"));

    const outcome = await run();

    expect(outcome).toMatchObject({ status: "deleted", deletion });
    expect(store).toMatchObject({ access: "deleted", deletion });
    expect(store.outbox).toHaveLength(1);

    server.failure = null;
    expect((await run()).status).toBe("synced");
    expect(store.access).toBe("ok");
    expect(store.deletion).toBeNull();
    expect(store.outbox).toEqual([]);
    expect(server.log.map((e) => e.operation.id)).toEqual(["create-e1"]);
  });

  it("a purged trip is unavailable, and the device stops asking", async () => {
    const { server, store, run } = setup();
    server.failure = { kind: "unavailable" };

    expect((await run()).status).toBe("unavailable");
    expect(store.access).toBe("unavailable");
    server.failure = null;
    expect((await run()).status).toBe("unavailable");
    expect(server.pullCalls).toHaveLength(1);
  });

  it("a trip made on this device before it had a link has nothing to sync", async () => {
    const { server, store, run } = setup();
    store.token = null;
    store.write(expenseCreated("e1"));

    expect((await run()).status).toBe("local");
    expect(server.pushCalls).toEqual([]);
  });

  it("an operation the push answer says nothing about stays in the outbox: only a rejection is final", async () => {
    const { server, store } = setup();
    const push = server.api.push;
    const api = {
      ...server.api,
      push: async (...args: Parameters<typeof push>) => {
        const answer = await push(...args);
        return answer.kind === "ok" ? { ...answer, results: answer.results.slice(0, 1) } : answer;
      },
    };
    store.write(expenseCreated("e1"), expenseCreated("e2"));

    await syncTrip({ tripId: "trip-1", store, api });

    expect(store.rejected).toEqual([]);
    expect(store.outbox.map((item) => item.operation.id)).toEqual(["create-e2"]);
    expect((await syncTrip({ tripId: "trip-1", store, api: server.api })).status).toBe("synced");
    expect(store.outbox).toEqual([]);
  });

  it("a push answer without results is an error and loses nothing", async () => {
    const { server, store } = setup();
    const api = { ...server.api, push: async () => ({ kind: "ok" as const, tripId: "trip-1" }) as Awaited<ReturnType<typeof server.api.push>> };
    store.write(expenseCreated("e1"));

    expect((await syncTrip({ tripId: "trip-1", store, api })).status).toBe("error");
    expect(store.outbox).toHaveLength(1);
    expect(store.rejected).toEqual([]);
  });

  it("an unexpected server answer is an error and loses nothing", async () => {
    const { server, store, run } = setup();
    server.failure = { kind: "error", status: 500 };
    store.write(expenseCreated("e1"));

    expect((await run()).status).toBe("error");
    expect(store.outbox).toHaveLength(1);
  });
});
