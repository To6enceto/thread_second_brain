import { test } from "node:test";
import assert from "node:assert/strict";
import { localEndpoint, loadSettings } from "./settings.ts";

test("endpoints are loopback HTTP origins without credentials or redirects", () => {
  assert.equal(localEndpoint("http://127.0.0.1:11434/"), "http://127.0.0.1:11434");
  assert.equal(localEndpoint("http://[::1]:11434"), "http://[::1]:11434");
  for (const endpoint of ["https://ollama.com", "http://127.0.0.1.attacker.test", "http://0.0.0.0:11434", "http://user:pass@localhost", "http://localhost/api", "http://localhost/?x=1"]) {
    assert.throws(() => localEndpoint(endpoint), Error, endpoint);
  }
});

test("invalid persisted settings never create read access or remote endpoints", () => {
  const settings = loadSettings({ endpoint: "https://example.com", allowedPaths: ["../", "/", "Projects"], excludedPaths: ["Projects/Private"], timeoutMs: -1 });
  assert.equal(settings.endpoint, "http://127.0.0.1:11434");
  assert.deepEqual(settings.allowedPaths, ["Projects"]);
  assert.equal(settings.timeoutMs, 180000);
  assert.deepEqual(loadSettings(null).allowedPaths, []);
});

test("malformed exclusion settings fail closed rather than broadening access", () => {
  for (const excludedPaths of ["Private", [null], ["../Private"]]) {
    assert.deepEqual(loadSettings({ allowedPaths: ["Projects"], excludedPaths }).allowedPaths, []);
  }
});
