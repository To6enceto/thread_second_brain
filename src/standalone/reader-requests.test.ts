import test from "node:test";
import assert from "node:assert/strict";
import { ReaderRequests } from "./reader-requests.ts";

test("refresh and source requests cannot discard a successful pending access transition", async () => {
  const requests = new ReaderRequests();
  let settle!: (revision: number) => void;
  const response = new Promise<number>(resolve => { settle = resolve; });
  let revision = 1;
  const ticket = requests.beginScope()!;
  const grant = response.then(next => { if (requests.finishScope(ticket)) revision = next; });
  assert.equal(requests.beginRead(), null); // Refresh while granting.
  assert.equal(requests.beginRead(), null); // Queued source click while granting.
  assert.equal(requests.beginScope(), null); // Repeated approval.
  settle(2); await grant;
  assert.equal(revision, 2);
  assert.notEqual(requests.beginRead(), null);
});

test("closing or replacing a vault revokes a pending scope reply and older source reads", () => {
  const requests = new ReaderRequests(), read = requests.beginRead()!;
  const grant = requests.beginScope()!;
  assert.equal(requests.current(read), false);
  requests.invalidate();
  assert.equal(requests.finishScope(grant), false);
  const next = requests.beginRead()!;
  assert.equal(requests.current(next), true);
  requests.invalidate(); assert.equal(requests.current(next), false);
});
