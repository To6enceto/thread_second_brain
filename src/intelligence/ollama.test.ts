import { test } from "node:test";
import assert from "node:assert/strict";
import { OllamaClient } from "./ollama.ts";

function fake(responses: unknown[], calls: string[]): typeof fetch {
  return (async (url, options) => {
    calls.push(String(url));
    assert.equal(options?.redirect, "error");
    return new Response(JSON.stringify(responses.shift()), { status: 200 });
  }) as typeof fetch;
}

test("enabled or unknown cloud status prevents any inference request", async () => {
  for (const status of [{ cloud: { disabled: false } }, {}]) {
    const calls: string[] = [];
    const client = new OllamaClient("http://127.0.0.1:11434", 1000, fake([status], calls));
    await assert.rejects(client.generate("qwen3:4b", "private note", new AbortController().signal), /cloud features must be disabled/);
    assert.deepEqual(calls, ["http://127.0.0.1:11434/api/status"]);
  }
});

test("remote models are rejected before the chat request", async () => {
  const calls: string[] = [];
  const client = new OllamaClient("http://127.0.0.1:11434", 1000, fake([
    { cloud: { disabled: true } }, { remote_host: "https://ollama.com", capabilities: ["completion"] }
  ], calls));
  await assert.rejects(client.generate("alias", "private note", new AbortController().signal), /fully downloaded local/);
  assert.equal(calls.length, 2);
  await assert.rejects(client.check("qwen:cloud", new AbortController().signal), /Cloud models/);
});

test("local generation checks status/model before sending its evidence", async () => {
  const calls: string[] = [];
  const client = new OllamaClient("http://127.0.0.1:11434", 1000, fake([
    { cloud: { disabled: true } }, { capabilities: ["completion"], model_info: { architecture: "qwen" } },
    { message: { content: "{}" } }
  ], calls));
  assert.equal(await client.generate("qwen3:4b", "evidence", new AbortController().signal), "{}");
  assert.deepEqual(calls.map((url) => new URL(url).pathname), ["/api/status", "/api/show", "/api/chat"]);
});

test("request cancellation interrupts the provider", async () => {
  const fetcher: typeof fetch = async (_url, options) => new Promise((_resolve, reject) => {
    const signal = options?.signal;
    signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
  });
  const controller = new AbortController();
  const request = new OllamaClient("http://127.0.0.1:11434", 1000, fetcher).check("qwen3:4b", controller.signal);
  controller.abort();
  await assert.rejects(request, { name: "AbortError" });
});

test("timeout produces an actionable failure and aborts the local request", async () => {
  const fetcher: typeof fetch = async (_url, options) => new Promise((_resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("The timeout did not abort the request")), 1000);
    options?.signal?.addEventListener("abort", () => { clearTimeout(timer); reject(options.signal?.reason); }, { once: true });
  });
  await assert.rejects(new OllamaClient("http://127.0.0.1:11434", 20, fetcher)
    .check("qwen3:4b", new AbortController().signal), /took too long/);
});
